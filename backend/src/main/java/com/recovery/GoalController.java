package com.recovery;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Macro targets — a single row (id 1). Created with the defaults if missing. */
@RestController
class GoalController {

  private final GoalRepository repository;

  GoalController(GoalRepository repository) {
    this.repository = repository;
  }

  private Goal getOrCreate() {
    return repository.findById(1L).orElseGet(() -> repository.save(new Goal()));
  }

  @GetMapping("/api/goals")
  Goal one() {
    return getOrCreate();
  }

  @PutMapping("/api/goals")
  Goal replace(@RequestBody Goal newGoal) {
    Goal goal = getOrCreate();
    goal.setCalories(newGoal.getCalories());
    goal.setProtein(newGoal.getProtein());
    goal.setCarbs(newGoal.getCarbs());
    goal.setFat(newGoal.getFat());
    return repository.save(goal);
  }
}
