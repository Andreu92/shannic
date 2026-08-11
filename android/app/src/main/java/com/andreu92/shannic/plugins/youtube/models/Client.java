package com.andreu92.shannic.plugins.youtube.models;

import com.fasterxml.jackson.annotation.JsonProperty;

public class Client {

    @JsonProperty("clientName")
    private String clientName = "ANDROID_VR";

    @JsonProperty("clientVersion")
    private String clientVersion;

    @JsonProperty("userAgent")
    private String userAgent;

    @JsonProperty("osName")
    private String osName = "Android";

    @JsonProperty("osVersion")
    private String osVersion = "12L";

    @JsonProperty("hl")
    private String hl = "en";

    @JsonProperty("timeZone")
    private String timeZone = "UTC";

    @JsonProperty("utcOffsetMinutes")
    private int utcOffsetMinutes = 0;

    @JsonProperty("deviceMake")
    private String deviceMake = "Oculus";

    @JsonProperty("deviceModel")
    private String deviceModel = "Quest 3";

    @JsonProperty("androidSdkVersion")
    private int androidSdkVersion = 32;

    public Client(String clientVersion, String userAgent) {
        this.clientVersion = clientVersion;
        this.userAgent = userAgent;
    }

    public String getClientName() {
        return clientName;
    }

    public void setClientName(String clientName) {
        this.clientName = clientName;
    }

    public String getClientVersion() {
        return clientVersion;
    }

    public void setClientVersion(String clientVersion) {
        this.clientVersion = clientVersion;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }

    public String getOsName() {
        return osName;
    }

    public void setOsName(String osName) {
        this.osName = osName;
    }

    public String getOsVersion() {
        return osVersion;
    }

    public void setOsVersion(String osVersion) {
        this.osVersion = osVersion;
    }

    public String getHl() {
        return hl;
    }

    public void setHl(String hl) {
        this.hl = hl;
    }

    public String getTimeZone() {
        return timeZone;
    }

    public void setTimeZone(String timeZone) {
        this.timeZone = timeZone;
    }

    public int getUtcOffsetMinutes() {
        return utcOffsetMinutes;
    }

    public void setUtcOffsetMinutes(int utcOffsetMinutes) {
        this.utcOffsetMinutes = utcOffsetMinutes;
    }

    public String getDeviceMake() {
        return deviceMake;
    }

    public void setDeviceMake(String deviceMake) {
        this.deviceMake = deviceMake;
    }

    public String getDeviceModel() {
        return deviceModel;
    }

    public void setDeviceModel(String deviceModel) {
        this.deviceModel = deviceModel;
    }

    public int getAndroidSdkVersion() {
        return androidSdkVersion;
    }

    public void setAndroidSdkVersion(int androidSdkVersion) {
        this.androidSdkVersion = androidSdkVersion;
    }
}
