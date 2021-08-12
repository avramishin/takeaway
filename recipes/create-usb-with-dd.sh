#!/bin/sh
fdisk  -l #to list devices
sudo umount /dev/sdX
sudo dd if=/path/to/ubuntu.iso of=/dev/sdX bs=4M && sync