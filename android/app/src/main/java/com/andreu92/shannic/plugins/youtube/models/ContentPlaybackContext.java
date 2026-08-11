package com.andreu92.shannic.plugins.youtube.models;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ContentPlaybackContext {

    @JsonProperty("html5Preference")
    private String html5Preference = "HTML5_PREF_WANTS";

    @JsonProperty("signatureTimestamp")
    private int signatureTimestamp;

    public ContentPlaybackContext(int signatureTimestamp) {
        this.signatureTimestamp = signatureTimestamp;
    }

    public String getHtml5Preference() {
        return html5Preference;
    }

    public void setHtml5Preference(String html5Preference) {
        this.html5Preference = html5Preference;
    }

    public int getSignatureTimestamp() {
        return signatureTimestamp;
    }

    public void setSignatureTimestamp(int signatureTimestamp) {
        this.signatureTimestamp = signatureTimestamp;
    }
}
