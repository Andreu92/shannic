package com.andreu92.shannic;

import android.os.Bundle;

import androidx.activity.EdgeToEdge;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

import com.andreu92.shannic.plugins.YoutubeClient;
import com.andreu92.shannic.plugins.player.PlayerPlugin;
import com.andreu92.shannic.plugins.player.PlayerService;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(PlayerPlugin.class);
        registerPlugin(YoutubeClient.class);

        super.onCreate(savedInstanceState);

        EdgeToEdge.enable(this);

        Bridge bridge = this.getBridge();
        PlayerService.setBridge(bridge);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);

        if (hasFocus) {
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
            controller.setSystemBarsBehavior(
                    WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            controller.hide(WindowInsetsCompat.Type.systemBars());
        }
    }
}
