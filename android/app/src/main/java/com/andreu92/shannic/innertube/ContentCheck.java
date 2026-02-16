package com.andreu92.shannic.innertube;

public record ContentCheck(
        boolean queryContentCheckOk,
        boolean racyCheckOk
) {}
