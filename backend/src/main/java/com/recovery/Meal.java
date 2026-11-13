package com.recovery;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** One meal on one day. Field names match the frontend's ft_meals entries. */
@Entity
@Table(name = "meals")
public class Meal {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String date; // yyyy-MM-dd
  private String name;
  private int calories;
  private int protein;
  private int carbs;
  private int fat;

  public Meal() {}

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getDate() { return date; }
  public void setDate(String date) { this.date = date; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public int getCalories() { return calories; }
  public void setCalories(int calories) { this.calories = calories; }
  public int getProtein() { return protein; }
  public void setProtein(int protein) { this.protein = protein; }
  public int getCarbs() { return carbs; }
  public void setCarbs(int carbs) { this.carbs = carbs; }
  public int getFat() { return fat; }
  public void setFat(int fat) { this.fat = fat; }
}
