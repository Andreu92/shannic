package com.andreu92.shannic.innertube;

public record InnerTubeContext(
        ClientContext client,
        Boolean userExternalId
) {}
