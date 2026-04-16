-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Apr 16, 2026 at 09:37 AM
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
-- Table structure for table `logs`
--

DROP TABLE IF EXISTS `logs`;
CREATE TABLE IF NOT EXISTS `logs` (
  `tracking_number` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `edats_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_forwarded` date DEFAULT NULL,
  `sender` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject` text COLLATE utf8mb4_unicode_ci,
  `actioned_required` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `due_in` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receiver` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action_taken_receiver` text COLLATE utf8mb4_unicode_ci,
  `time_received` time DEFAULT NULL,
  `date_received` date DEFAULT NULL,
  `route_history` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`tracking_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `logs`
--

INSERT INTO `logs` (`tracking_number`, `edats_number`, `date_forwarded`, `sender`, `document_type`, `subject`, `actioned_required`, `due_in`, `receiver`, `action_taken_receiver`, `time_received`, `date_received`, `route_history`, `status`) VALUES
('PMD-20260416-0001', 'EDTS-PMD0001-0001', '2026-04-13', 'PMD', 'Memo', 'Initialize route_history table (separate table)', '[\"For appropriate action\"]', 'simple', 'OJT', 'created the separated table needed', '15:32:00', '2026-04-14', NULL, 'Pending');

-- --------------------------------------------------------

--
-- Table structure for table `route_history`
--

DROP TABLE IF EXISTS `route_history`;
CREATE TABLE IF NOT EXISTS `route_history` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `tracking_number` varchar(255) NOT NULL,
  `step_index` int NOT NULL,
  `personnel` varchar(255) NOT NULL,
  `action` varchar(255) DEFAULT NULL,
  `remarks` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_route_step` (`tracking_number`,`step_index`),
  KEY `idx_route_tracking` (`tracking_number`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `route_history`
--

INSERT INTO `route_history` (`id`, `tracking_number`, `step_index`, `personnel`, `action`, `remarks`, `created_at`) VALUES
(9, 'PMD-20260416-0001', 1, 'PMD Records Unit', 'Logged', 'Initial routing record', '2026-04-16 08:59:28'),
(10, 'PMD-20260416-0001', 2, 'PMD Staff', 'Forwarded', 'Forwarded to next office', '2026-04-16 08:59:28'),
(11, 'PMD-20260416-0001', 3, 'OJT', 'created the separated table needed', NULL, '2026-04-16 08:59:28');
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
