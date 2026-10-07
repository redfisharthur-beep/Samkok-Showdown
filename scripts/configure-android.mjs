import fs from 'node:fs';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
const gradlePath = 'android/app/build.gradle';
const mainActivityPath = 'android/app/src/main/java/com/samkok/showdown/MainActivity.java';
const pluginPath = 'android/app/src/main/java/com/samkok/showdown/LineLoginPlugin.java';

if (!fs.existsSync(manifestPath)) throw new Error('AndroidManifest.xml not found. Run npx cap add android first.');

let manifest = fs.readFileSync(manifestPath, 'utf8');
const activityPattern = /<activity\b([\s\S]*?android:name="\.MainActivity"[\s\S]*?)>/;
const match = manifest.match(activityPattern);
if (!match) throw new Error('MainActivity entry not found in AndroidManifest.xml.');
if (!/android:screenOrientation=/.test(match[0])) {
  manifest = manifest.replace(match[0], match[0].replace(/<activity\b/, '<activity\n            android:screenOrientation="portrait"'));
}
if (!manifest.includes('android:scheme="samkokshowdown"')) {
  manifest = manifest.replace(/<\/activity>/, `            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="samkokshowdown" android:host="auth" />
            </intent-filter>
        </activity>`);
}
fs.writeFileSync(manifestPath, manifest);

if (!fs.existsSync(gradlePath)) throw new Error('Android app build.gradle not found.');
let gradle = fs.readFileSync(gradlePath, 'utf8');
if (!gradle.includes('com.linecorp.linesdk:linesdk:')) {
  gradle = gradle.replace(/dependencies\s*\{/, "dependencies {\n    implementation 'com.linecorp.linesdk:linesdk:latest.release'");
}
fs.writeFileSync(gradlePath, gradle);

fs.mkdirSync(pluginPath.slice(0, pluginPath.lastIndexOf('/')), {recursive:true});
fs.writeFileSync(pluginPath, `package com.samkok.showdown;

import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.linecorp.linesdk.Scope;
import com.linecorp.linesdk.auth.LineAuthenticationParams;
import com.linecorp.linesdk.auth.LineLoginApi;
import com.linecorp.linesdk.auth.LineLoginResult;
import java.security.SecureRandom;
import java.util.Arrays;

@CapacitorPlugin(name = "LineLogin")
public class LineLoginPlugin extends Plugin {
    private static final String CHANNEL_ID = "2011852042";

    @PluginMethod
    public void login(PluginCall call) {
        byte[] bytes = new byte[24];
        new SecureRandom().nextBytes(bytes);
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format("%02x", b));
        String nonce = sb.toString();
        call.setKeepAlive(true);
        call.getData().put("nativeNonce", nonce);
        LineAuthenticationParams params = new LineAuthenticationParams.Builder()
            .scopes(Arrays.asList(Scope.PROFILE, Scope.OPENID_CONNECT))
            .nonce(nonce)
            .build();
        Intent intent = LineLoginApi.getLoginIntent(getContext(), CHANNEL_ID, params);
        startActivityForResult(call, intent, "handleLoginResult");
    }

    @ActivityCallback
    private void handleLoginResult(PluginCall call, ActivityResult activityResult) {
        if (call == null) return;
        try {
            LineLoginResult result = LineLoginApi.getLoginResultFromIntent(activityResult.getData());
            if (result == null || !result.isSuccess() || result.getLineIdToken() == null) {
                String detail = result == null ? "no result" : String.valueOf(result.getErrorData());
                call.reject("LINE 登入失敗: " + detail);
                return;
            }
            JSObject out = new JSObject();
            out.put("idToken", result.getLineIdToken().getRawString());
            out.put("nonce", call.getData().getString("nativeNonce"));
            call.resolve(out);
        } catch (Exception e) {
            call.reject("LINE 登入失敗", e);
        } finally {
            call.setKeepAlive(false);
        }
    }
}
`);

if (!fs.existsSync(mainActivityPath)) throw new Error('MainActivity.java not found.');
let main = fs.readFileSync(mainActivityPath, 'utf8');
if (!main.includes('registerPlugin(LineLoginPlugin.class)')) {
  if (!main.includes('android.os.Bundle')) main = main.replace('package com.samkok.showdown;', 'package com.samkok.showdown;\n\nimport android.os.Bundle;');
  if (main.includes('public class MainActivity extends BridgeActivity {}')) {
    main = main.replace('public class MainActivity extends BridgeActivity {}', `public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(LineLoginPlugin.class);
    super.onCreate(savedInstanceState);
  }
}`);
  } else if (main.includes('public class MainActivity extends BridgeActivity {')) {
    main = main.replace('public class MainActivity extends BridgeActivity {', `public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(LineLoginPlugin.class);
    super.onCreate(savedInstanceState);
  }`);
  } else throw new Error('Unexpected MainActivity.java format.');
}
fs.writeFileSync(mainActivityPath, main);
console.log('Android native configuration applied: portrait, deep link, and native LINE Login SDK.');
