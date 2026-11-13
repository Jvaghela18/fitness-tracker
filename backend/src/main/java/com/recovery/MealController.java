package com.recovery;

import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
class MealController {

  private final MealRepository repository;

  MealController(MealRepository repository) {
    this.repository = repository;
  }

  @GetMapping("/api/meals")
  List<Meal> all(@RequestParam(required = false) String date) {
    if (date != null && !date.isBlank()) {
      return repository.findByDateOrderByIdAsc(date);
    }
    return repository.findAll();
  }

  @PostMapping("/api/meals")
  Meal newMeal(@RequestBody Meal newMeal) {
    if (newMeal.getDate() == null || newMeal.getDate().isBlank()) {
      throw new IllegalArgumentException("A meal needs a date (yyyy-MM-dd).");
    }
    return repository.save(newMeal);
  }

  @DeleteMapping("/api/meals/{id}")
  void deleteMeal(@PathVariable Long id) {
    if (!repository.existsById(id)) {
      throw new ResourceNotFoundException("meal " + id);
    }
    repository.deleteById(id);
  }
}
