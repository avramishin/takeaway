#!/bin/sh
mogrify -strip -interlace Plane -gaussian-blur 0.05 -quality 85% *.jpg