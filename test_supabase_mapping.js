const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jjlgdihlwwhkxoymrhrw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqbGdkaWhsd3doa3hveW1yaHJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5OTA2OTEsImV4cCI6MjEwMjU2NjY5MX0.-9q4CxZWtA3L2H4NgthNjk5MdYXrtkqwXeZAEVNGY7o';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function studentToDb(s) {
  return {
    id: s.id,
    code: s.code,
    name: s.name,
    phone: s.phone,
    parent_name: s.parentName,
    parent_phone: s.parentPhone,
    address: s.address || '',
    academic_year: s.academicYear || 'FIRST_SEC',
    group_id: s.groupId || null,
    status: s.status || 'PENDING',
    registered_at: s.registeredAt || new Date().toISOString(),
  };
}

function dbToStudent(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    phone: row.phone,
    parentName: row.parent_name,
    parentPhone: row.parent_phone,
    address: row.address,
    academicYear: row.academic_year,
    groupId: row.group_id,
    status: row.status,
    registeredAt: row.registered_at,
  };
}

async function testSupabase() {
  console.log('Testing Supabase Student Insert & Fetch...');
  const testStudent = {
    id: `std-test-${Date.now()}`,
    code: '105',
    name: 'طالب تجريبي للاختبار',
    phone: '01011112222',
    parentName: 'ولي الأمر التجريبي',
    parentPhone: '01233334444',
    address: 'المنصورة',
    academicYear: 'FIRST_SEC',
    groupId: 'grp-1',
    status: 'ACTIVE',
    registeredAt: new Date().toISOString(),
  };

  const { data: insertData, error: insertError } = await supabase
    .from('students')
    .upsert(studentToDb(testStudent), { onConflict: 'id' })
    .select();

  if (insertError) {
    console.error('Insert error:', insertError);
    return;
  }
  console.log('Insert success:', insertData);

  const { data: fetchRows, error: fetchError } = await supabase
    .from('students')
    .select('*')
    .eq('code', '105');

  if (fetchError) {
    console.error('Fetch error:', fetchError);
    return;
  }

  console.log('Fetched student:', dbToStudent(fetchRows[0]));
  console.log('Test completed successfully! 🎉');
}

testSupabase();
