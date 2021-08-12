#!/bin/sh
socat tcp-listen:3003,reuseaddr,fork tcp:remote-host.com:3306