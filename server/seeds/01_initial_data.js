/**
 * Seed: Initial Reference Data for Smart IT Helpdesk
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  // 1. Initial SLA Policies
  const existingSla = await knex('sla_policies').select('id');
  if (existingSla.length === 0) {
    await knex('sla_policies').insert([
      { priority: 'P1', response_minutes: 15, resolution_minutes: 120, is_active: true },
      { priority: 'P3', response_minutes: 240, resolution_minutes: 1440, is_active: true },
    ]);
  }

  // 2. Initial Categories
  const existingCategories = await knex('categories').select('id');
  if (existingCategories.length === 0) {
    await knex('categories').insert([
      { name: 'Phần cứng & Thiết bị', description: 'Máy tính, máy in, máy chiếu, thiết bị ngoại vi', is_active: true },
      { name: 'Mạng & Kết nối', description: 'Mất mạng Wifi, mạng LAN, đường truyền Internet', is_active: true },
      { name: 'Phần mềm & Hệ thống LMS', description: 'Hệ thống quản lý điểm, LMS, phần mềm giảng dạy', is_active: true },
      { name: 'Tài khoản & Quyền truy cập', description: 'Email trường BTEC FPT, mật khẩu, phân quyền', is_active: true },
    ]);
  }

  // 3. Initial Priority Rules
  const existingRules = await knex('priority_rules').select('id');
  if (existingRules.length === 0) {
    await knex('priority_rules').insert([
      { keyword: 'server sập', normalized_keyword: 'server sap', priority: 'P1', is_active: true },
      { keyword: 'mất mạng', normalized_keyword: 'mat mang', priority: 'P1', is_active: true },
      { keyword: 'lỗi 500', normalized_keyword: 'loi 500', priority: 'P1', is_active: true },
      { keyword: 'sập hệ thống', normalized_keyword: 'sap he thong', priority: 'P1', is_active: true },
      { keyword: 'không vào được lms', normalized_keyword: 'khong vao duoc lms', priority: 'P1', is_active: true },
      { keyword: 'lỗi nhỏ', normalized_keyword: 'loi nho', priority: 'P3', is_active: true },
    ]);
  }

  // Account onboarding requires explicit owner approval and is separate from reference data.
}

