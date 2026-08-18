const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jjlgdihlwwhkxoymrhrw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqbGdkaWhsd3doa3hveW1yaHJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5OTA2OTEsImV4cCI6MjEwMjU2NjY5MX0.-9q4CxZWtA3L2H4NgthNjk5MdYXrtkqwXeZAEVNGY7o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testExamsAndGrades() {
  console.log('Testing Exams and Grades Upsert...');

  // 1. Fetch all exams
  const { data: exams, error: exErr } = await supabase.from('exams').select('*');
  console.log('Exams in DB:', exams, exErr);

  // 2. Fetch all students
  const { data: students, error: stdErr } = await supabase.from('students').select('*');
  console.log('Students in DB:', students?.length, stdErr);

  if (exams && exams.length > 0 && students && students.length > 0) {
    const examId = exams[0].id;
    const studentId = students[0].id;

    console.log(`Testing grade upsert for Exam ${examId} and Student ${studentId}...`);

    const resultPayload = {
      id: `res-${examId}-${studentId}`,
      exam_id: examId,
      student_id: studentId,
      score: 18.5,
      feedback: 'ممتاز جداً تم حفظ الدرجة بنجاح',
      parent_notified: false,
      student_notified: false,
      graded_at: new Date().toISOString(),
    };

    const { data: upsertData, error: upsertErr } = await supabase
      .from('exam_results')
      .upsert(resultPayload, { onConflict: 'exam_id,student_id' });

    console.log('Upsert result:', upsertData, 'Error:', upsertErr);
  }
}

testExamsAndGrades();
