CXX ?= g++
CXXFLAGS ?= -O3 -std=c++17 -fPIC -Wall -Wextra

UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
	TARGET := libdecember_native.dylib
	LDFLAGS := -shared
else ifeq ($(OS),Windows_NT)
	TARGET := december_native.dll
	LDFLAGS := -shared
else
	TARGET := libdecember_native.so
	LDFLAGS := -shared
endif

all: $(TARGET)

$(TARGET): myers_patch.cpp myers_patch.h
	$(CXX) $(CXXFLAGS) $(LDFLAGS) -o $@ myers_patch.cpp

clean:
	rm -f *.so *.dylib *.dll *.o

.PHONY: all clean
