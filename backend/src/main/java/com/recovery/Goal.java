package com.recovery;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Macro targets. There is only one row, id = 1, matching ft_goals. */
@Entity
@Table(name = "goals")
public class Goal {

  @Id
  private Long id = 1L;

  private int calories = 2200;
  private int protein = 150;
  private int carbs = 250;
  private int fat = 70;

  public Goal() {}

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public int getCalories() { return calories; }
  public void setCalories(int calories) { this.calories = calories; }
  public int getProtein() { return protein; }
  public void setProtein(int protein) { this.protein = protein; }
  public int getCarbs() { return carbs; }
  public void setCarbs(int carbs) { this.carbs = carbs; }
  public int getFat() { return fat; }
  public void setFat(int fat) { this.fat = fat; }
}
