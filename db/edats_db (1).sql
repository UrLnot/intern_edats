-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: May 11, 2026 at 07:57 AM
-- Server version: 8.4.7
-- PHP Version: 8.3.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `edats_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `edats_attachments`
--

DROP TABLE IF EXISTS `edats_attachments`;
CREATE TABLE IF NOT EXISTS `edats_attachments` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `tracking_number` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `stored_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size` bigint NOT NULL,
  `url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` longblob,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_attachments_tracking` (`tracking_number`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `edats_employees`
--

DROP TABLE IF EXISTS `edats_employees`;
CREATE TABLE IF NOT EXISTS `edats_employees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `section` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `edats_employees`
--

INSERT INTO `edats_employees` (`id`, `name`, `position`, `section`) VALUES
(1, 'Maria Renelle S. Cajalne', 'Statistician II', 'Regional Statistics Unit'),
(2, 'Dave D. Salvador', 'Information System Analyst II', 'Regional Statistics Unit'),
(3, 'Marie Junette B. Sitti', 'Statistician II', 'Regional Statistics Unit'),
(4, 'Cedric Francis E. Accos', 'Statistician I', 'Regional Statistics Unit'),
(5, 'Almazon B. Odsev', 'Statistician I', 'Regional Statistics Unit'),
(6, 'Joan M. Marcos', 'Planning Officer I', 'Regional Statistics Unit'),
(7, 'Rose Marie B. Astadan', 'Planning Officer III (Section Chief)', 'Planning and Programming Section'),
(8, 'Patricia S. Tavaban', 'Planning Officer II', 'Planning and Programming Section'),
(9, 'Maria Renelle S. Cajalne', 'Statistician II', 'Planning and Programming Section'),
(10, 'Almazon B. Odsev', 'Statistician I', 'Planning and Programming Section'),
(11, 'Joan M. Marcos', 'Planning Officer I', 'Planning and Programming Section'),
(12, 'Theresa B. Tilcag', 'Project Evaluation Officer III (Section Chief)', 'Monitoring and Evaluation Section'),
(13, 'Carmela D. Dangsian-Estol', 'Project Evaluation Officer II', 'Monitoring and Evaluation Section'),
(14, 'Marie Junette B. Sitti', 'Statistician II', 'Monitoring and Evaluation Section'),
(15, 'Cedric Francis E. Accos', 'Statistician I', 'Monitoring and Evaluation Section'),
(16, 'Cris Edison C. Carretero', 'Project Evaluation Officer I', 'Monitoring and Evaluation Section'),
(17, 'Cirilo M. Gali', 'Information Systems Analyst III (Unit Head)', 'Regional ICT Unit'),
(18, 'Dave D. Salvador', 'Information System Analyst II', 'Regional ICT Unit'),
(19, 'Jonah S. Changloven', 'Administrative Assistant III (Computer Operator II)', 'Regional ICT Unit');

-- --------------------------------------------------------

--
-- Table structure for table `edats_logs`
--

DROP TABLE IF EXISTS `edats_logs`;
CREATE TABLE IF NOT EXISTS `edats_logs` (
  `tracking_number` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `archived` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`tracking_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `edats_logs`
--

INSERT INTO `edats_logs` (`tracking_number`, `subject`, `document_type`, `status`, `created_at`, `archived`) VALUES
('PMD-20260511-0001', 'Seeded Pending 1', 'Memorandum', 'Completed', '2026-05-11 01:17:32', 1),
('PMD-20260511-0002', 'Seeded Pending 2', 'Endorsement', 'Pending', '2026-05-11 01:17:32', 0),
('PMD-20260511-0010', 'TESTING', 'Letter', 'Completed', '2026-05-11 01:29:14', 1);

-- --------------------------------------------------------

--
-- Table structure for table `edats_steps`
--

DROP TABLE IF EXISTS `edats_steps`;
CREATE TABLE IF NOT EXISTS `edats_steps` (
  `tracking_number` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `step_number` int NOT NULL,
  `sender` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_taken` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `action_required` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `receiver` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `section` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `due_in` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'simple',
  `date_forwarded` date DEFAULT NULL,
  `date_received` date DEFAULT NULL,
  `time_received` time DEFAULT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tracking_number`,`step_number`),
  UNIQUE KEY `uniq_tracking_step` (`tracking_number`,`step_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `edats_steps`
--

INSERT INTO `edats_steps` (`tracking_number`, `step_number`, `sender`, `action_taken`, `action_required`, `remarks`, `receiver`, `section`, `due_in`, `date_forwarded`, `date_received`, `time_received`, `status`, `created_at`) VALUES
('PMD-20260511-0001', 1, 'Seeder User', 'Originated', '[\"For evaluation/review\"]', 'Seed data', 'Test Receiver', 'Plans and Programs', 'simple', '2026-05-11', '2026-05-11', '13:21:42', 'Completed', '2026-05-11 01:17:32'),
('PMD-20260511-0001', 2, 'Test Receiver', NULL, '[\"For appropriate action\"]', NULL, 'Rose Marie B. Astadan', 'Plans and Programs', 'simple', '2026-05-11', '2026-05-11', '13:22:38', 'Completed', '2026-05-11 05:21:43'),
('PMD-20260511-0001', 3, 'Rose Marie B. Astadan', NULL, '[]', NULL, NULL, 'Plans and Programs', 'simple', '2026-05-11', '2026-05-11', '13:22:38', 'Completed', '2026-05-11 05:22:38'),
('PMD-20260511-0002', 1, 'Seeder User', 'Originated', '[\"For evaluation/review\"]', 'Seed data', 'Test Receiver', 'Monitoring and Evaluation', 'simple', '2026-05-11', '2026-05-11', '15:53:18', 'Completed', '2026-05-11 01:17:32'),
('PMD-20260511-0002', 2, 'Test Receiver', 'asdwqde', '[\"For appropriate action\"]', NULL, 'Carmela D. Dangsian-Estol', 'Monitoring and Evaluation', 'simple', '2026-05-11', NULL, NULL, 'Pending', '2026-05-11 07:53:18'),
('PMD-20260511-0010', 1, 'PMD', 'Originated', '[\"For appropriate action\",\"For information/record/file\"]', NULL, 'Cirilo M. Gali', NULL, 'simple', '2026-05-11', '2026-05-11', '09:29:32', 'Completed', '2026-05-11 01:29:14'),
('PMD-20260511-0010', 2, 'Cirilo M. Gali', NULL, '[\"For appropriate action\",\"For implementation\"]', NULL, 'Dave D. Salvador', 'ICT', 'simple', '2026-05-11', '2026-05-11', '09:29:54', 'Completed', '2026-05-11 01:29:32'),
('PMD-20260511-0010', 3, 'Dave D. Salvador', 'implementation', '[\"For evaluation/review\",\"For appropriate action\"]', NULL, 'Jonah S. Changloven', 'ICT', 'simple', '2026-05-11', '2026-05-11', '09:30:09', 'Completed', '2026-05-11 01:29:54'),
('PMD-20260511-0010', 4, 'Jonah S. Changloven', 'evaluation', '[\"For acknowledgement\"]', NULL, 'Cirilo M. Gali', 'ICT', 'simple', '2026-05-11', '2026-05-11', '09:30:22', 'Completed', '2026-05-11 01:30:09'),
('PMD-20260511-0010', 5, 'Cirilo M. Gali', 'acknowledged', '[]', NULL, NULL, 'ICT', 'simple', '2026-05-11', '2026-05-11', '09:30:22', 'Completed', '2026-05-11 01:30:22');

--
-- Constraints for dumped tables
--

--
-- Constraints for table `edats_attachments`
--
ALTER TABLE `edats_attachments`
  ADD CONSTRAINT `fk_attachments_tracking_overhaul` FOREIGN KEY (`tracking_number`) REFERENCES `edats_logs` (`tracking_number`) ON DELETE CASCADE;

--
-- Constraints for table `edats_steps`
--
ALTER TABLE `edats_steps`
  ADD CONSTRAINT `fk_step_tracking` FOREIGN KEY (`tracking_number`) REFERENCES `edats_logs` (`tracking_number`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
