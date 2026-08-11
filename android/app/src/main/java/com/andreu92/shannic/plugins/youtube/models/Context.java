package com.andreu92.shannic.plugins.youtube.models;

import com.fasterxml.jackson.annotation.JsonProperty;

public class Context {

    @JsonProperty("client")
    private Client client;

    public Context(Client client) {
        this.client = client;
    }

    public Client getClient() {
        return client;
    }

    public void setClient(Client client) {
        this.client = client;
    }
}
