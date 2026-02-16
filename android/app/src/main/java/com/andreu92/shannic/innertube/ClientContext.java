package com.andreu92.shannic.innertube;

public record ClientContext(
        String clientName,
        String clientVersion,
        String deviceMake,
        String deviceModel,
        int androidSdkVersion,
        String userAgent,
        String osName,
        String osVersion) {}
