ALTER TABLE `exercise_records`
  MODIFY `exerciseType` ENUM(
    'WALKING',
    'RUNNING',
    'CYCLING',
    'SWIMMING',
    'STRENGTH',
    'BODYWEIGHT',
    'YOGA',
    'OTHER'
  ) NOT NULL;
