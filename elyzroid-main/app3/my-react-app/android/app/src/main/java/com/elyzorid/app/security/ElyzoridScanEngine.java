package com.elyzorid.app.security;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipInputStream;

/**
 * Java port of backend/server.py scanning logic for Android Studio usage.
 * This class ports heuristic logic and response structure.
 * ML model loading from Python joblib/tensorflow is intentionally omitted.
 */
public final class ElyzoridScanEngine {

    private ElyzoridScanEngine() {}

    public static final class ScanResponse {
        public double score;
        public String risk;
        public String verdict;
        public String inputType;
        public Map<String, Object> meta = new HashMap<>();
        public Map<String, Object> xai = new HashMap<>();
        public String explanation;
        public List<String> recommendations = new ArrayList<>();
        public Map<String, Object> modelBreakdown = new HashMap<>();
        public Map<String, Object> fileInfo = new HashMap<>();
        public Map<String, Object> remediation = new HashMap<>();
    }

    private static final Map<String, Double> DANGEROUS_PERMISSIONS = new HashMap<>();
    private static final List<Pattern> MALICIOUS_PATTERNS = new ArrayList<>();
    private static final Set<String> HIGH_RISK_KEYWORDS = new HashSet<>();
    private static final Set<String> MEDIUM_RISK_KEYWORDS = new HashSet<>();

    static {
        DANGEROUS_PERMISSIONS.put("SEND_SMS", 0.35);
        DANGEROUS_PERMISSIONS.put("READ_SMS", 0.30);
        DANGEROUS_PERMISSIONS.put("RECEIVE_SMS", 0.30);
        DANGEROUS_PERMISSIONS.put("CALL_PHONE", 0.25);
        DANGEROUS_PERMISSIONS.put("PROCESS_OUTGOING_CALLS", 0.35);
        DANGEROUS_PERMISSIONS.put("READ_PHONE_STATE", 0.15);
        DANGEROUS_PERMISSIONS.put("READ_CONTACTS", 0.15);
        DANGEROUS_PERMISSIONS.put("RECORD_AUDIO", 0.20);
        DANGEROUS_PERMISSIONS.put("CAMERA", 0.10);
        DANGEROUS_PERMISSIONS.put("ACCESS_FINE_LOCATION", 0.10);
        DANGEROUS_PERMISSIONS.put("SYSTEM_ALERT_WINDOW", 0.25);
        DANGEROUS_PERMISSIONS.put("WRITE_SETTINGS", 0.15);
        DANGEROUS_PERMISSIONS.put("RECEIVE_BOOT_COMPLETED", 0.15);
        DANGEROUS_PERMISSIONS.put("INSTALL_PACKAGES", 0.40);
        DANGEROUS_PERMISSIONS.put("DELETE_PACKAGES", 0.30);
        DANGEROUS_PERMISSIONS.put("BIND_ACCESSIBILITY_SERVICE", 0.40);
        DANGEROUS_PERMISSIONS.put("BIND_NOTIFICATION_LISTENER_SERVICE", 0.30);

        MALICIOUS_PATTERNS.add(Pattern.compile("https?://\\d{1,3}(?:\\.\\d{1,3}){3}", Pattern.CASE_INSENSITIVE));
        MALICIOUS_PATTERNS.add(Pattern.compile("(?:bit\\.ly|tinyurl|t\\.co|goo\\.gl|short\\.link|ow\\.ly)/", Pattern.CASE_INSENSITIVE));
        MALICIOUS_PATTERNS.add(Pattern.compile("https?://[^/\\s]*\\.(xyz|tk|ml|ga|cf|top|click|link|pw)", Pattern.CASE_INSENSITIVE));
        MALICIOUS_PATTERNS.add(Pattern.compile("\\b(0x[a-fA-F0-9]{40}|bc1[ac-hj-np-z02-9]{11,71})\\b"));

        HIGH_RISK_KEYWORDS.addAll(Arrays.asList(
                "verify account", "suspended", "password expired", "unusual activity",
                "confirm your identity", "bank verification", "wire transfer", "gift card",
                "send money", "crypto investment", "double your money"
        ));
        MEDIUM_RISK_KEYWORDS.addAll(Arrays.asList(
                "urgent", "click here", "limited time", "congratulations you won",
                "free gift", "claim now", "act immediately", "lottery winner", "inheritance"
        ));
    }

    public static ScanResponse scanText(String text, String source) {
        String input = text == null ? "" : text.trim();
        if (input.isEmpty()) throw new IllegalArgumentException("text is required");

        double score = 0.15;
        List<String> reasons = new ArrayList<>();
        String lower = input.toLowerCase(Locale.ROOT);

        for (Pattern p : MALICIOUS_PATTERNS) {
            if (p.matcher(input).find()) {
                score += 0.30;
                reasons.add("matched pattern: " + p.pattern());
            }
        }

        for (String kw : HIGH_RISK_KEYWORDS) {
            if (lower.contains(kw)) {
                score += 0.25;
                reasons.add("high-risk keyword: " + kw);
                break;
            }
        }
        for (String kw : MEDIUM_RISK_KEYWORDS) {
            if (lower.contains(kw)) {
                score += 0.15;
                reasons.add("medium-risk keyword: " + kw);
                break;
            }
        }

        score = Math.min(1.0, score);
        String[] label = scoreToLabel(score);

        ScanResponse r = new ScanResponse();
        r.score = round4(score);
        r.risk = label[0];
        r.verdict = label[1];
        r.inputType = source == null ? "text" : source;
        r.meta.put("text_length", input.length());
        r.xai.put("top_reasons", reasons);
        r.recommendations = recommendationsForRisk(r.risk);
        if ("HIGH".equals(r.risk)) applyRemediation(r, null);
        return r;
    }

    public static ScanResponse scanFilename(String filename) {
        if (filename == null || filename.trim().isEmpty()) throw new IllegalArgumentException("filename is required");
        String name = filename.toLowerCase(Locale.ROOT);
        double score = 0.30;
        List<String> reasons = new ArrayList<>(Collections.singletonList("filename-only scan"));

        if (containsAny(name, "malware", "trojan", "spy", "hack", "crack", "keylogger", "botnet", "rat", "stealer")) {
            score = 0.92;
            reasons.add("malicious filename keyword");
        } else if (containsAny(name, "cheat", "mod", "premium", "unlocker", "generator", "fake", "free")) {
            score = 0.55;
            reasons.add("suspicious filename keyword");
        } else if (containsAny(name, "system", "google", "android", "chrome", "gallery", "camera", "clock")) {
            score = 0.08;
            reasons.add("known safe app name");
        }

        String[] label = scoreToLabel(score);
        ScanResponse r = new ScanResponse();
        r.score = round4(score);
        r.risk = label[0];
        r.verdict = label[1];
        r.inputType = "filename";
        r.xai.put("top_reasons", reasons);
        if ("HIGH".equals(r.risk)) applyRemediation(r, null);
        return r;
    }

    public static ScanResponse scanApkBytes(byte[] apkBytes, String filename) {
        if (apkBytes == null || apkBytes.length == 0) throw new IllegalArgumentException("apk bytes required");
        ApkStats stats = extractApkFeatures(apkBytes);
        HeuristicResult h = heuristicApkScore(stats, filename == null ? "unknown.apk" : filename.toLowerCase(Locale.ROOT));
        String[] label = scoreToLabel(h.score);

        ScanResponse r = new ScanResponse();
        r.score = round4(h.score);
        r.risk = label[0];
        r.verdict = label[1];
        r.inputType = "apk";
        r.xai.put("top_reasons", h.reasons);
        r.meta.put("sha256", stats.sha256);
        r.meta.put("packageName", stats.packageName);
        r.fileInfo.put("filename", filename);
        r.fileInfo.put("sizeBytes", stats.sizeBytes);
        r.fileInfo.put("sha256Prefix", stats.sha256.substring(0, Math.min(16, stats.sha256.length())));
        r.fileInfo.put("fileType", "APK");
        r.fileInfo.put("dexCount", stats.dexCount);
        r.fileInfo.put("fileCount", stats.fileCount);
        r.fileInfo.put("permissions", stats.permissions);
        r.fileInfo.put("packageName", stats.packageName);
        r.fileInfo.put("minSdk", stats.minSdk);
        r.fileInfo.put("targetSdk", stats.targetSdk);
        r.recommendations = recommendationsForRisk(r.risk);
        if ("HIGH".equals(r.risk)) applyRemediation(r, stats.packageName);
        return r;
    }

    private static void applyRemediation(ScanResponse r, String packageName) {
        r.remediation.put("required", true);
        r.remediation.put("message", "This app is malicious. Do you want to block or uninstall it?");
        r.remediation.put("actions", Arrays.asList("block", "uninstall"));
        r.remediation.put("packageName", packageName);
    }

    private static List<String> recommendationsForRisk(String risk) {
        if ("LOW".equals(risk)) return Arrays.asList("This item appears safe.", "Continue normal usage.");
        if ("MEDIUM".equals(risk)) return Arrays.asList("Review carefully before install.", "Do not trust unknown links.");
        return Arrays.asList("Do not install/use this app.", "Block or uninstall immediately.");
    }

    private static boolean containsAny(String s, String... keys) {
        for (String k : keys) if (s.contains(k)) return true;
        return false;
    }

    private static String[] scoreToLabel(double score) {
        if (score < 0.30) return new String[]{"LOW", "Safe"};
        if (score < 0.60) return new String[]{"MEDIUM", "Suspicious"};
        return new String[]{"HIGH", "Malicious"};
    }

    private static double round4(double d) {
        return Math.round(d * 10000.0) / 10000.0;
    }

    private static final class HeuristicResult {
        double score;
        List<String> reasons = new ArrayList<>();
    }

    private static final class ApkStats {
        String sha256;
        int sizeBytes;
        List<String> permissions = new ArrayList<>();
        List<String> suspiciousStrings = new ArrayList<>();
        int dexCount;
        int fileCount;
        Integer minSdk;
        Integer targetSdk;
        String packageName;
    }

    private static HeuristicResult heuristicApkScore(ApkStats stats, String filename) {
        HeuristicResult out = new HeuristicResult();
        double score = 0.0;

        double permScore = 0.0;
        for (String p : stats.permissions) permScore += DANGEROUS_PERMISSIONS.getOrDefault(p, 0.05);
        score += Math.min(permScore, 0.60);
        if (permScore > 0) out.reasons.add(stats.permissions.size() + " dangerous permissions");

        double strScore = Math.min(stats.suspiciousStrings.size() * 0.04, 0.35);
        score += strScore;
        if (strScore > 0) out.reasons.add(stats.suspiciousStrings.size() + " suspicious strings");

        if (containsAny(filename, "malware", "trojan", "spy", "hack", "crack", "keylogger", "botnet", "rat", "stealer")) {
            score += 0.30;
            out.reasons.add("malicious filename keyword");
        } else if (containsAny(filename, "cheat", "mod", "premium", "unlocker", "generator", "fake")) {
            score += 0.15;
            out.reasons.add("suspicious filename keyword");
        }

        if (stats.sizeBytes < 512 * 1024 && !stats.permissions.isEmpty()) {
            score += 0.10;
            out.reasons.add("tiny APK with permissions");
        }
        if (stats.minSdk != null && stats.minSdk < 21) {
            score += 0.08;
            out.reasons.add("very low minSdk");
        }

        out.score = Math.min(1.0, score);
        return out;
    }

    private static ApkStats extractApkFeatures(byte[] apkBytes) {
        ApkStats s = new ApkStats();
        s.sizeBytes = apkBytes.length;
        s.sha256 = sha256(apkBytes);

        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(apkBytes))) {
            ZipEntry e;
            while ((e = zis.getNextEntry()) != null) {
                s.fileCount++;
                String name = e.getName().toLowerCase(Locale.ROOT);
                if (name.endsWith(".dex")) s.dexCount++;
            }
        } catch (IOException ignored) {}

        // String-level extraction from APK bytes to keep behavior close to Python backend.
        String text = new String(apkBytes, StandardCharsets.UTF_8);
        for (String perm : DANGEROUS_PERMISSIONS.keySet()) if (text.contains(perm)) s.permissions.add(perm);

        for (Pattern p : MALICIOUS_PATTERNS) {
            Matcher m = p.matcher(text);
            while (m.find() && s.suspiciousStrings.size() < 50) s.suspiciousStrings.add(m.group());
        }

        Matcher pkg = Pattern.compile("package=\"([^\"]+)\"").matcher(text);
        if (pkg.find()) s.packageName = pkg.group(1);

        Matcher minSdk = Pattern.compile("minSdkVersion.*?[\"']?(\\d+)").matcher(text);
        if (minSdk.find()) s.minSdk = safeInt(minSdk.group(1));
        Matcher targetSdk = Pattern.compile("targetSdkVersion.*?[\"']?(\\d+)").matcher(text);
        if (targetSdk.find()) s.targetSdk = safeInt(targetSdk.group(1));

        return s;
    }

    private static Integer safeInt(String v) {
        try { return Integer.parseInt(v); } catch (Exception e) { return null; }
    }

    private static String sha256(byte[] data) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(data);
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            return "";
        }
    }
}
