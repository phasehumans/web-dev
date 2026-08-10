cmake_minimum_required(VERSION 3.14)
project(december_native CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

add_library(december_native SHARED myers_patch.cpp myers_patch.h)

set_target_properties(december_native PROPERTIES
    PREFIX "lib"
    OUTPUT_NAME "december_native"
)
