#!/bin/sh
sudo cpupower frequency-set -g performance
watch grep \"cpu MHz\" /proc/cpuinfo