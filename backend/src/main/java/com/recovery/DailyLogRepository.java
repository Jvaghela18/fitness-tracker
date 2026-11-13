package com.recovery;

import org.springframework.data.jpa.repository.JpaRepository;

interface DailyLogRepository extends JpaRepository<DailyLog, String> {
}
