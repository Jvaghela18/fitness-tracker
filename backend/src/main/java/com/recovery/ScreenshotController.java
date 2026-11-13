package com.recovery;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Server-side Groq screenshot reading. Only works when the GROQ_API_KEY
 * environment variable is set on the server. The key is never in code,
 * never logged, and never sent to the browser.
 * Without a server key it returns 501 and tells the caller to use the
 * browser Settings key instead (src/groq.js) — the working route.
 * Model: qwen/qwen3.8-27b only, no fallback.
 * Uses the JDK HttpClient (no extra dependency).
 */
@RestController
class ScreenshotController {

  private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
  private static final String MODEL = "qwen/qwen3.8-27b";

  private final String groqApiKey;
  private final ObjectMapper mapper = new ObjectMapper();

  ScreenshotController(@Value("${GROQ_API_KEY:}") String groqApiKey) {
    this.groqApiKey = groqApiKey == null ? "" : groqApiKey.trim();
  }

  @PostMapping(value = "/api/screenshot", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  ResponseEntity<?> readScreenshot(@RequestParam("image") MultipartFile image) {
    if (groqApiKey.isBlank()) {
      return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
          .body(Map.of("error",
              "No server Groq key is configured (GROQ_API_KEY is not set). "
              + "Save your own key in the app's Settings tab instead — the browser Groq path still works."));
    }
    if (image == null || image.isEmpty()) {
      return ResponseEntity.badRequest().body(Map.of("error", "Attach a screenshot image first."));
    }
    try {
      String mime = image.getContentType() == null ? "image/jpeg" : image.getContentType();
      String dataUrl = "data:" + mime + ";base64,"
          + Base64.getEncoder().encodeToString(image.getBytes());
      String system = "You read health stats from a screenshot. Return ONLY a JSON object, no other text. "
          + "Keys: sleepHours, sleepScore, deepSleepMin, remSleepMin, restingHr, avgHr, maxHr, hrvMs, "
          + "stressScore, steps, distanceKm, activeCalories, weightKg. Use null for any value not visible "
          + "in the image. Do not guess. sleepScore is the sleep score only; a stress score goes in "
          + "stressScore, never in sleepScore.";
      // dataUrl is base64 + a safe mime type, so it contains no quotes to escape.
      String body = "{\"model\":\"" + MODEL + "\",\"temperature\":0,\"max_tokens\":600,\"messages\":["
          + "{\"role\":\"system\",\"content\":\"" + system.replace("\"", "\\\"") + "\"},"
          + "{\"role\":\"user\",\"content\":["
          + "{\"type\":\"text\",\"text\":\"Read the visible health stats from this screenshot and return them as JSON only.\"},"
          + "{\"type\":\"image_url\",\"image_url\":{\"url\":\"" + dataUrl + "\"}}]}]}";

      HttpClient client = HttpClient.newHttpClient();
      HttpRequest req = HttpRequest.newBuilder(URI.create(GROQ_URL))
          .header("Content-Type", "application/json")
          .header("Authorization", "Bearer " + groqApiKey)
          .POST(HttpRequest.BodyPublishers.ofString(body))
          .build();
      HttpResponse<String> res = client.send(req, HttpResponse.BodyHandlers.ofString());
      if (res.statusCode() < 200 || res.statusCode() >= 300) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
            .body(Map.of("error", "Groq call failed (" + res.statusCode() + "). No numbers were taken from the screenshot."));
      }
      JsonNode root = mapper.readTree(res.body());
      String text = root.path("choices").path(0).path("message").path("content").asText("");
      int start = text.indexOf('{');
      int end = text.lastIndexOf('}');
      if (start == -1 || end <= start) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
            .body(Map.of("error", "Groq returned text that was not JSON, so no numbers were taken from it."));
      }
      return ResponseEntity.ok(Map.of("modelUsed", MODEL, "statsJson", text.substring(start, end + 1)));
    } catch (Exception e) {
      return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
          .body(Map.of("error", "Groq call failed. No numbers were taken from the screenshot."));
    }
  }
}
