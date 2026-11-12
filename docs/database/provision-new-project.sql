-- OWNER REVIEW REQUIRED. Do not execute before explicit approval.
-- Check names are unused first. Run without --force; stop at any error.
SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME IN ('smart_it_helpdesk_new_dev', 'smart_it_helpdesk_new_test');
SELECT User, Host FROM mysql.user WHERE User IN ('sih_new_app', 'sih_new_test', 'sih_new_dev_migrate', 'sih_new_test_migrate');

CREATE DATABASE `smart_it_helpdesk_new_dev` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE `smart_it_helpdesk_new_test` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE USER 'sih_new_app'@'127.0.0.1' IDENTIFIED BY '<REPLACE_WITH_UNIQUE_LOCAL_SECRET_sih_new_app>';
GRANT SELECT, INSERT, UPDATE, DELETE ON `smart_it_helpdesk_new_dev`.* TO 'sih_new_app'@'127.0.0.1';
SHOW GRANTS FOR 'sih_new_app'@'127.0.0.1';

CREATE USER 'sih_new_test'@'127.0.0.1' IDENTIFIED BY '<REPLACE_WITH_UNIQUE_LOCAL_SECRET_sih_new_test>';
GRANT SELECT, INSERT, UPDATE, DELETE ON `smart_it_helpdesk_new_test`.* TO 'sih_new_test'@'127.0.0.1';
SHOW GRANTS FOR 'sih_new_test'@'127.0.0.1';

CREATE USER 'sih_new_dev_migrate'@'127.0.0.1' IDENTIFIED BY '<REPLACE_WITH_UNIQUE_LOCAL_SECRET_sih_new_dev_migrate>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON `smart_it_helpdesk_new_dev`.* TO 'sih_new_dev_migrate'@'127.0.0.1';
SHOW GRANTS FOR 'sih_new_dev_migrate'@'127.0.0.1';

CREATE USER 'sih_new_test_migrate'@'127.0.0.1' IDENTIFIED BY '<REPLACE_WITH_UNIQUE_LOCAL_SECRET_sih_new_test_migrate>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON `smart_it_helpdesk_new_test`.* TO 'sih_new_test_migrate'@'127.0.0.1';
SHOW GRANTS FOR 'sih_new_test_migrate'@'127.0.0.1';
