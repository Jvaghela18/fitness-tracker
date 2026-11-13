package com.recovery;

import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
class DailyLogController {

  private final DailyLogRepository repository;

  DailyLogController(DailyLogRepository repository) {
    this.repository = repository;
  }

  @GetMapping("/api/logs")
  List<DailyLog> all() {
    return repository.findAll();
  }

  @PostMapping("/api/logs")
  DailyLog newLog(@RequestBody DailyLog newLog) {
    if (newLog.getDate() == null || newLog.getDate().isBlank()) {
      throw new IllegalArgumentException("A log needs a date (yyyy-MM-dd).");
    }
    return repository.save(newLog);
  }

  @GetMapping("/api/logs/{date}")
  DailyLog one(@PathVariable String date) {
    return repository.findById(date)
        .orElseThrow(() -> new ResourceNotFoundException("daily log " + date));
  }

  @PutMapping("/api/logs/{date}")
  DailyLog replaceLog(@RequestBody DailyLog newLog, @PathVariable String date) {
    return repository.findById(date)
        .map(log -> {
          log.setSleepHours(newLog.getSleepHours());
          log.setSleepScore(newLog.getSleepScore());
          log.setDeepSleepMin(newLog.getDeepSleepMin());
          log.setRemSleepMin(newLog.getRemSleepMin());
          log.setRestingHr(newLog.getRestingHr());
          log.setAvgHr(newLog.getAvgHr());
          log.setMaxHr(newLog.getMaxHr());
          log.setHrvMs(newLog.getHrvMs());
          log.setStressScore(newLog.getStressScore());
          log.setSteps(newLog.getSteps());
          log.setDistanceKm(newLog.getDistanceKm());
          log.setActiveCalories(newLog.getActiveCalories());
          log.setWeightKg(newLog.getWeightKg());
          log.setWaterMl(newLog.getWaterMl());
          log.setMood(newLog.getMood());
          log.setEnergy(newLog.getEnergy());
          log.setWorkout(newLog.getWorkout());
          log.setNotes(newLog.getNotes());
          return repository.save(log);
        })
        .orElseGet(() -> {
          newLog.setDate(date);
          return repository.save(newLog);
        });
  }

  @DeleteMapping("/api/logs/{date}")
  void deleteLog(@PathVariable String date) {
    if (!repository.existsById(date)) {
      throw new ResourceNotFoundException("daily log " + date);
    }
    repository.deleteById(date);
  }
}
