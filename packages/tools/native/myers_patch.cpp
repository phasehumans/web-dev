#include "myers_patch.h"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <cstdlib>
#include <cstring>
#include <sstream>
#include <string>
#include <string_view>
#include <vector>

namespace {

std::string trim_right(const std::string& str) {
    std::string s = str;
    while (!s.empty() && (s.back() == ' ' || s.back() == '\t' || s.back() == '\r')) {
        s.pop_back();
    }
    return s;
}

std::vector<std::string> split_lines(const std::string& text) {
    std::vector<std::string> lines;
    std::stringstream ss(text);
    std::string line;
    while (std::getline(ss, line)) {
        if (!line.empty() && line.back() == '\r') {
            line.pop_back();
        }
        lines.push_back(line);
    }
    return lines;
}

struct Hunk {
    int old_start = 1;
    int old_count = 0;
    int new_start = 1;
    int new_count = 0;
    std::vector<std::string> old_lines;
    std::vector<std::string> new_lines;
};

bool parse_hunk_header(const std::string& line, Hunk& hunk) {
    if (line.rfind("@@", 0) != 0) return false;
    
    size_t end_hunk = line.find("@@", 2);
    if (end_hunk == std::string::npos) return false;
    
    std::string header = line.substr(2, end_hunk - 2);
    std::stringstream ss(header);
    std::string old_part, new_part;
    ss >> old_part >> new_part;

    if (!old_part.empty() && old_part[0] == '-') old_part = old_part.substr(1);
    if (!new_part.empty() && new_part[0] == '+') new_part = new_part.substr(1);

    size_t old_comma = old_part.find(',');
    if (old_comma != std::string::npos) {
        hunk.old_start = std::stoi(old_part.substr(0, old_comma));
        hunk.old_count = std::stoi(old_part.substr(old_comma + 1));
    } else if (!old_part.empty()) {
        hunk.old_start = std::stoi(old_part);
        hunk.old_count = 1;
    }

    size_t new_comma = new_part.find(',');
    if (new_comma != std::string::npos) {
        hunk.new_start = std::stoi(new_part.substr(0, new_comma));
        hunk.new_count = std::stoi(new_part.substr(new_comma + 1));
    } else if (!new_part.empty()) {
        hunk.new_start = std::stoi(new_part);
        hunk.new_count = 1;
    }

    return true;
}

std::vector<Hunk> parse_diff(const std::string& diff_str) {
    std::vector<Hunk> hunks;
    auto lines = split_lines(diff_str);

    Hunk current_hunk;
    bool in_hunk = false;

    for (const auto& line : lines) {
        if (line.rfind("@@ ", 0) == 0) {
            if (in_hunk) {
                hunks.push_back(current_hunk);
            }
            current_hunk = Hunk();
            if (parse_hunk_header(line, current_hunk)) {
                in_hunk = true;
            } else {
                in_hunk = false;
            }
            continue;
        }

        if (!in_hunk) continue;

        if (line.empty()) {
            current_hunk.old_lines.push_back("");
            current_hunk.new_lines.push_back("");
        } else if (line[0] == ' ') {
            std::string content = line.substr(1);
            current_hunk.old_lines.push_back(content);
            current_hunk.new_lines.push_back(content);
        } else if (line[0] == '-') {
            current_hunk.old_lines.push_back(line.substr(1));
        } else if (line[0] == '+') {
            current_hunk.new_lines.push_back(line.substr(1));
        }
    }

    if (in_hunk) {
        hunks.push_back(current_hunk);
    }

    return hunks;
}

float match_score(const std::vector<std::string>& file_lines, size_t file_idx, const std::vector<std::string>& pattern_lines) {
    if (file_idx + pattern_lines.size() > file_lines.size()) return 0.0f;
    
    if (pattern_lines.empty()) return 1.0f;

    int matches = 0;
    for (size_t i = 0; i < pattern_lines.size(); ++i) {
        const std::string& f = file_lines[file_idx + i];
        const std::string& p = pattern_lines[i];

        if (f == p) {
            matches += 2;
        } else if (trim_right(f) == trim_right(p)) {
            matches += 1;
        }
    }

    return static_cast<float>(matches) / (2.0f * pattern_lines.size());
}

int find_best_match_offset(const std::vector<std::string>& file_lines, const Hunk& hunk, float fuzz_factor) {
    int expected_idx = std::max(0, hunk.old_start - 1);
    
    if (hunk.old_lines.empty()) {
        return std::min<int>(expected_idx, static_cast<int>(file_lines.size()));
    }

    // Try exact position first
    float score = match_score(file_lines, expected_idx, hunk.old_lines);
    if (score >= 0.99f) return expected_idx;

    // Search outwards from expected_idx
    int max_radius = static_cast<int>(file_lines.size());
    int best_idx = -1;
    float best_score = fuzz_factor;

    for (int r = 1; r <= max_radius; ++r) {
        int up = expected_idx - r;
        int down = expected_idx + r;

        if (up >= 0) {
            float s = match_score(file_lines, up, hunk.old_lines);
            if (s > best_score) {
                best_score = s;
                best_idx = up;
                if (s >= 0.99f) return best_idx;
            }
        }

        if (down + hunk.old_lines.size() <= file_lines.size()) {
            float s = match_score(file_lines, down, hunk.old_lines);
            if (s > best_score) {
                best_score = s;
                best_idx = down;
                if (s >= 0.99f) return best_idx;
            }
        }
    }

    return best_idx;
}

} // namespace

extern "C" {

char* patch_fuzzy(const char* original_content, const char* unified_diff, float fuzz_factor) {
    if (!original_content || !unified_diff) return nullptr;

    std::string target_str(original_content);
    std::string diff_str(unified_diff);

    auto hunks = parse_diff(diff_str);
    if (hunks.empty()) return nullptr;

    auto file_lines = split_lines(target_str);
    
    // Sort hunks or process backwards to preserve line indices if multiple hunks
    for (const auto& hunk : hunks) {
        int target_idx = find_best_match_offset(file_lines, hunk, fuzz_factor);
        if (target_idx < 0) {
            return nullptr; // Patch application failed
        }

        auto erase_start = file_lines.begin() + target_idx;
        auto erase_end = erase_start + hunk.old_lines.size();

        if (erase_end > file_lines.end()) {
            erase_end = file_lines.end();
        }

        file_lines.erase(erase_start, erase_end);
        file_lines.insert(file_lines.begin() + target_idx, hunk.new_lines.begin(), hunk.new_lines.end());
    }

    std::stringstream result_ss;
    for (size_t i = 0; i < file_lines.size(); ++i) {
        result_ss << file_lines[i];
        if (i + 1 < file_lines.size()) {
            result_ss << "\n";
        }
    }

    std::string res = result_ss.str();
    char* out = static_cast<char*>(malloc(res.size() + 1));
    if (!out) return nullptr;

    std::memcpy(out, res.c_str(), res.size() + 1);
    return out;
}

void free_string(char* ptr) {
    if (ptr) {
        free(ptr);
    }
}

}
