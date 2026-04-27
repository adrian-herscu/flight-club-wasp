type LessonDurationLike = {
  durationMinutes: number;
};

export function calculateCourseTotalPrice(
  hourlyRate: number,
  lessons: LessonDurationLike[],
): number {
  const totalMinutes = lessons.reduce((sum, lesson) => sum + lesson.durationMinutes, 0);
  return Math.round((totalMinutes / 60) * hourlyRate);
}
