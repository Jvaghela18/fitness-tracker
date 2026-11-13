package com.recovery;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Same-origin calls (the app served by this backend on port 8080) need no
 * CORS. This only covers the old two-server setup — the frontend served
 * separately on localhost:8000 / VS Code Live Server 5500 — so that way
 * still works too.
 */
@Configuration
class WebConfig implements WebMvcConfigurer {

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/api/**")
        .allowedOrigins("http://localhost:8000", "http://127.0.0.1:8000",
            "http://localhost:5500", "http://127.0.0.1:5500")
        .allowedMethods("GET", "POST", "PUT", "DELETE")
        .allowedHeaders("*");
  }
}
