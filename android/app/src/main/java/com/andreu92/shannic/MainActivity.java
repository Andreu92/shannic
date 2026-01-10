package com.andreu92.shannic;

import android.os.Bundle;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

import com.shannic.plugins.audioplayer.AudioPlayerService;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Bridge bridge = this.getBridge();
        AudioPlayerService.setBridge(bridge);
    }
}
