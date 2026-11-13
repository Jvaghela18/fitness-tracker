package com.recovery;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * One day's log. The date (yyyy-MM-dd) is the ID, matching the frontend's
 * ft_logs map (date -> log). Field names match src/app.js LOG_FIELDS exactly.
 */
@Entity
@Table(name = "daily_logs")
public class DailyLog {

  @Id
  private String date; // yyyy-MM-dd

  private Double sleepHours;
  private Integer sleepScore;
  private Integer deepSleepMin;
  private Integer remSleepMin;
  private Integer restingHr;
  private Integer avgHr;
  private Integer maxHr;
  private Integer hrvMs;
  private Integer stressScore;
  private Integer steps;
  private Double distanceKm;
  private Integer activeCalories;
  private Double weightKg;
  private Integer waterMl;
  private String mood;
  private String energy;
  private String workout;

  @Column(length = 2000)
  private String notes;

  public DailyLog() {}

  public String getDate() { return date; }
  public void setDate(String date) { this.date = date; }
  public Double getSleepHours() { return sleepHours; }
  public void setSleepHours(Double sleepHours) { this.sleepHours = sleepHours; }
  public Integer getSleepScore() { return sleepScore; }
  public void setSleepScore(Integer sleepScore) { this.sleepScore = sleepScore; }
  public Integer getDeepSleepMin() { return deepSleepMin; }
  public void setDeepSleepMin(Integer deepSleepMin) { this.deepSleepMin = deepSleepMin; }
  public Integer getRemSleepMin() { return remSleepMin; }
  public void setRemSleepMin(Integer remSleepMin) { this.remSleepMin = remSleepMin; }
  public Integer getRestingHr() { return restingHr; }
  public void setRestingHr(Integer restingHr) { this.restingHr = restingHr; }
  public Integer getAvgHr() { return avgHr; }
  public void setAvgHr(Integer avgHr) { this.avgHr = avgHr; }
  public Integer getMaxHr() { return maxHr; }
  public void setMaxHr(Integer maxHr) { this.maxHr = maxHr; }
  public Integer getHrvMs() { return hrvMs; }
  public void setHrvMs(Integer hrvMs) { this.hrvMs = hrvMs; }
  public Integer getStressScore() { return stressScore; }
  public void setStressScore(Integer stressScore) { this.stressScore = stressScore; }
  public Integer getSteps() { return steps; }
  public void setSteps(Integer steps) { this.steps = steps; }
  public Double getDistanceKm() { return distanceKm; }
  public void setDistanceKm(Double distanceKm) { this.distanceKm = distanceKm; }
  public Integer getActiveCalories() { return activeCalories; }
  public void setActiveCalories(Integer activeCalories) { this.activeCalories = activeCalories; }
  public Double getWeightKg() { return weightKg; }
  public void setWeightKg(Double weightKg) { this.weightKg = weightKg; }
  public Integer getWaterMl() { return waterMl; }
  public void setWaterMl(Integer waterMl) { this.waterMl = waterMl; }
  public String getMood() { return mood; }
  public void setMood(String mood) { this.mood = mood; }
  public String getEnergy() { return energy; }
  public void setEnergy(String energy) { this.energy = energy; }
  public String getWorkout() { return workout; }
  public void setWorkout(String workout) { this.workout = workout; }
  public String getNotes() { return notes; }
  public void setNotes(String notes) { this.notes = notes; }
}
