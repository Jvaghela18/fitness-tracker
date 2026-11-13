package com.recovery;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface MealRepository extends JpaRepository<Meal, Long> {
  List<Meal> findByDateOrderByIdAsc(String date);
}
