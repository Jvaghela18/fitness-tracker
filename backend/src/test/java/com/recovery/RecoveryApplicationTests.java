package com.recovery;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class RecoveryApplicationTests {

  @Autowired
  private MockMvc mockMvc;

  @Test
  void healthReturnsOk() throws Exception {
    mockMvc.perform(get("/api/health"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ok"));
  }

  @Test
  void missingLogReturns404() throws Exception {
    mockMvc.perform(get("/api/logs/2099-01-01"))
        .andExpect(status().isNotFound());
  }

  @Test
  void goalsReturnDefaults() throws Exception {
    mockMvc.perform(get("/api/goals"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.calories").value(2200))
        .andExpect(jsonPath("$.protein").value(150));
  }
}
