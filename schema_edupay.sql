-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: 10.0.1.11    Database: edupay_db
-- ------------------------------------------------------
-- Server version	8.0.46-0ubuntu0.22.04.2

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `edupay_db`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `edupay_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `edupay_db`;

--
-- Table structure for table `TB_COM_ACCOUNT`
--

DROP TABLE IF EXISTS `TB_COM_ACCOUNT`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_ACCOUNT` (
  `ACCOUNT_ID` varchar(50) NOT NULL COMMENT '계좌 아이디',
  `USER_ID` varchar(50) NOT NULL COMMENT '사용자 아이디',
  `BANK_NM` varchar(30) DEFAULT NULL,
  `BANK_CD` varchar(10) DEFAULT NULL COMMENT '은행코드 (NH:농협, SH:신한 등)',
  `ACCOUNT_NO` varchar(30) DEFAULT NULL,
  `LIMIT_AMOUNT` bigint NOT NULL DEFAULT '0' COMMENT '한도 금액',
  `MASKED_ACCOUNT_NO` varchar(30) DEFAULT NULL COMMENT '계좌번호(마스킹)',
  `USE_YN` char(1) NOT NULL DEFAULT 'Y' COMMENT '사용여부(Y/N)',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  `BALANCE_AMT` bigint NOT NULL DEFAULT '0' COMMENT '계좌 잔액',
  `BALANCE_UPD_DT` datetime DEFAULT NULL COMMENT '최종잔액수정일시',
  PRIMARY KEY (`ACCOUNT_ID`),
  KEY `IDX_TB_COM_ACCOUNT_01` (`USER_ID`),
  CONSTRAINT `FK_TB_COM_ACCOUNT_01` FOREIGN KEY (`USER_ID`) REFERENCES `TB_COM_USER` (`USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='회원 계좌';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_ACCOUNT_LOG`
--

DROP TABLE IF EXISTS `TB_COM_ACCOUNT_LOG`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_ACCOUNT_LOG` (
  `ACCOUNT_LOG_SN` bigint NOT NULL COMMENT '계좌 로그 일련번호',
  `ACCOUNT_ID` varchar(50) NOT NULL COMMENT '계좌 아이디',
  `USER_ID` varchar(50) NOT NULL COMMENT '사용자 아이디',
  `AMOUNT` bigint NOT NULL DEFAULT '0' COMMENT '금액',
  `TYPE_CD` varchar(10) NOT NULL COMMENT '거래유형(C:계좌충전, S:지원금, P:용돈요청, R:환불, E:지원금회수)',
  `BANK_TRX_NO` varchar(100) DEFAULT NULL COMMENT '은행거래번호',
  `RMRK` varchar(500) DEFAULT NULL COMMENT '비고',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  PRIMARY KEY (`ACCOUNT_LOG_SN`),
  KEY `IDX_TB_COM_ACCOUNT_LOG_01` (`ACCOUNT_ID`),
  KEY `IDX_TB_COM_ACCOUNT_LOG_02` (`USER_ID`),
  CONSTRAINT `FK_TB_COM_ACCOUNT_LOG_01` FOREIGN KEY (`ACCOUNT_ID`) REFERENCES `TB_COM_ACCOUNT` (`ACCOUNT_ID`),
  CONSTRAINT `FK_TB_COM_ACCOUNT_LOG_02` FOREIGN KEY (`USER_ID`) REFERENCES `TB_COM_USER` (`USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='회원 계좌 로그';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_ADBK`
--

DROP TABLE IF EXISTS `TB_COM_ADBK`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_ADBK` (
  `ADBK_SN` bigint NOT NULL AUTO_INCREMENT COMMENT '주소록 일련번호',
  `USER_ID` varchar(50) NOT NULL COMMENT '사용자 아이디',
  `USER_NM` varchar(100) DEFAULT NULL COMMENT '사용자명',
  `USER_NICK_NM` varchar(100) DEFAULT NULL COMMENT '닉네임',
  `USER_TELNO` varchar(30) DEFAULT NULL COMMENT '사용자전화번호',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime DEFAULT NULL COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  PRIMARY KEY (`ADBK_SN`,`USER_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='주소록';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_ATND`
--

DROP TABLE IF EXISTS `TB_COM_ATND`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_ATND` (
  `ATND_SN` bigint NOT NULL AUTO_INCREMENT COMMENT '출결 일련번호',
  `USER_ID` varchar(50) NOT NULL COMMENT '사용자 아이디',
  `ATND_YN` varchar(1) NOT NULL COMMENT 'Y: 출석, N: 결석',
  `SJ` varchar(100) DEFAULT NULL COMMENT '한줄 일기 제목',
  `EMO_NM` varchar(20) DEFAULT NULL COMMENT '감정 표현 파일명',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime DEFAULT NULL COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime DEFAULT NULL COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  PRIMARY KEY (`ATND_SN`,`USER_ID`),
  KEY `IDX_TB_COM_ATND_01` (`ATND_SN`,`USER_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='출결';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_ATTENDANCE`
--

DROP TABLE IF EXISTS `TB_COM_ATTENDANCE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_ATTENDANCE` (
  `ATTENDANCE_ID` bigint NOT NULL COMMENT '출결 아이디',
  `USER_ID` varchar(50) NOT NULL COMMENT '사용자 아이디',
  `STATUS` varchar(20) NOT NULL COMMENT 'ATTEND: 출석, ABSENCE: 결석',
  `QR_ID` varchar(50) DEFAULT NULL COMMENT '큐알 코드 아이디',
  `SJ` varchar(100) DEFAULT NULL COMMENT '한줄 일기 제목',
  `EMOJI_ICON_NM` varchar(50) DEFAULT NULL COMMENT '감정 표현',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime DEFAULT NULL COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime DEFAULT NULL COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  PRIMARY KEY (`ATTENDANCE_ID`),
  KEY `IDX_TB_COM_ATTENDANCE_01` (`USER_ID`),
  CONSTRAINT `FK_TB_COM_ATTENDANCE_01` FOREIGN KEY (`USER_ID`) REFERENCES `TB_COM_USER` (`USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='출결';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_BANNER`
--

DROP TABLE IF EXISTS `TB_COM_BANNER`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_BANNER` (
  `BANNER_ID` varchar(50) NOT NULL COMMENT '배너 아이디',
  `BANNER_SJ` varchar(765) NOT NULL COMMENT '배너 제목',
  `BANNER_LINK` varchar(255) DEFAULT NULL COMMENT '배너 링크',
  `ATCH_FILE_ID` varchar(50) DEFAULT NULL COMMENT '첨부파일아이디',
  `DISPLAY_ORDER` int DEFAULT '0' COMMENT '정렬 순서',
  `EXPSR_YN` char(1) DEFAULT 'Y' COMMENT '노출 여부',
  `USE_YN` char(1) DEFAULT 'Y' COMMENT '사용 여부',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime DEFAULT NULL COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime DEFAULT NULL COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  PRIMARY KEY (`BANNER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='배너';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_BBS`
--

DROP TABLE IF EXISTS `TB_COM_BBS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_BBS` (
  `BBS_ID` varchar(100) NOT NULL COMMENT '게시물 아이디',
  `STNG_ID` varchar(100) NOT NULL COMMENT '게시판 아이디',
  `UP_BBS_ID` varchar(100) DEFAULT NULL COMMENT '상위게시물 아이디',
  `SORT_SEQ` decimal(10,0) DEFAULT '0' COMMENT '정렬순서',
  `BBS_NM` varchar(256) DEFAULT NULL COMMENT '게시판명',
  `BBS_CN` varchar(4000) DEFAULT NULL COMMENT '게시판내용',
  `THMB_URL_ADDR` varchar(200) DEFAULT NULL COMMENT '썸네일URL주소',
  `URL_ADDR` varchar(200) DEFAULT NULL COMMENT 'URL주소',
  `HGHRK_YN` char(1) DEFAULT NULL COMMENT '최상위여부',
  `ATCH_FILE_ID` varchar(50) DEFAULT NULL COMMENT '첨부파일아이디',
  `INQ_CNT` decimal(10,0) DEFAULT '0' COMMENT '조회수',
  `RLS_YN` char(1) DEFAULT NULL COMMENT '공개여부',
  `USER_NM` varchar(100) DEFAULT NULL COMMENT '사용자 명',
  `ANS_CN` varchar(4000) DEFAULT NULL COMMENT '답변 내용',
  `ANS_DT` datetime DEFAULT NULL COMMENT '답변 일자',
  `ANSWR_NM` varchar(100) DEFAULT NULL COMMENT '답변자명',
  `ANSWR_ID` varchar(50) DEFAULT NULL COMMENT '답변자아이디',
  `DLTR_ID` varchar(50) DEFAULT NULL COMMENT '삭제자아이디',
  `DEL_DT` datetime DEFAULT NULL COMMENT '삭제일시',
  `DEL_YN` char(1) DEFAULT 'N' COMMENT '삭제여부',
  `DLTR_NM` varchar(100) DEFAULT NULL COMMENT '삭제자명',
  `DLTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '삭제자IP주소',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime DEFAULT NULL COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime DEFAULT NULL COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  `URL_NM` varchar(100) DEFAULT NULL COMMENT '링크 주소 명',
  `BBS_CD` varchar(4) DEFAULT NULL COMMENT '게시판 분류 코드',
  PRIMARY KEY (`BBS_ID`),
  KEY `IDX_TB_COM_BBS_01` (`STNG_ID`),
  KEY `IDX_TB_COM_BBS_02` (`UP_BBS_ID`),
  CONSTRAINT `FK_TB_COM_BBS_01` FOREIGN KEY (`STNG_ID`) REFERENCES `TB_COM_BBS_STNG` (`STNG_ID`),
  CONSTRAINT `FK_TB_COM_BBS_02` FOREIGN KEY (`UP_BBS_ID`) REFERENCES `TB_COM_BBS` (`BBS_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='게시물';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_BBS_CMNT`
--

DROP TABLE IF EXISTS `TB_COM_BBS_CMNT`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_BBS_CMNT` (
  `CMNT_SN` decimal(10,0) NOT NULL COMMENT '댓글일련번호',
  `BBS_ID` varchar(100) NOT NULL COMMENT '게시물 아이디',
  `CMNT_CN` varchar(500) DEFAULT NULL COMMENT '댓글내용',
  `UP_CMNT_SN` decimal(10,0) DEFAULT NULL COMMENT '상위 댓글 번호',
  `USER_NM` varchar(100) DEFAULT NULL COMMENT '사용자명',
  `SORT_SEQ` decimal(5,0) DEFAULT NULL COMMENT '정렬순서',
  `REF_STEP` decimal(2,0) DEFAULT NULL COMMENT '대댓글 들여쓰기 순서',
  `REF_SORT_SEQ` decimal(3,0) DEFAULT NULL COMMENT '대댓글 정렬 순서',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime DEFAULT NULL COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime DEFAULT NULL COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  PRIMARY KEY (`CMNT_SN`),
  KEY `IDX_TB_COM_BBS_CMNT_01` (`BBS_ID`),
  KEY `IDX_TB_COM_BBS_CMNT_02` (`UP_CMNT_SN`),
  CONSTRAINT `FK_TB_COM_BBS_CMNT_01` FOREIGN KEY (`BBS_ID`) REFERENCES `TB_COM_BBS` (`BBS_ID`),
  CONSTRAINT `FK_TB_COM_BBS_CMNT_02` FOREIGN KEY (`UP_CMNT_SN`) REFERENCES `TB_COM_BBS_CMNT` (`CMNT_SN`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='게시물 댓글';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_BBS_INQ`
--

DROP TABLE IF EXISTS `TB_COM_BBS_INQ`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_BBS_INQ` (
  `LOG_SN` decimal(10,0) NOT NULL COMMENT '로그일련번호',
  `BBS_ID` varchar(100) NOT NULL COMMENT '게시판아이디',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `FRST_REG_DT` datetime DEFAULT NULL COMMENT '최초등록일시',
  PRIMARY KEY (`LOG_SN`),
  KEY `IDX_TB_COM_BBS_INQ_01` (`BBS_ID`),
  CONSTRAINT `FK_TB_COM_BBS_INQ_01` FOREIGN KEY (`BBS_ID`) REFERENCES `TB_COM_BBS` (`BBS_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='게시물 조회 이력';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_BBS_STNG`
--

DROP TABLE IF EXISTS `TB_COM_BBS_STNG`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_BBS_STNG` (
  `STNG_ID` varchar(100) NOT NULL COMMENT '설정아이디',
  `STNG_SN` decimal(22,0) NOT NULL COMMENT '설정일련번호',
  `TYPE_SE` varchar(10) DEFAULT NULL COMMENT '유형구분',
  `STNG_NM` varchar(200) DEFAULT NULL COMMENT '설정명',
  `STNG_NM_KO` varchar(200) DEFAULT NULL COMMENT '설정명(한글)',
  `STNG_NM_EN` varchar(200) DEFAULT NULL COMMENT '설정명(영문)',
  `STNG_NM_ZH` varchar(200) DEFAULT NULL COMMENT '설정명(중문)',
  `EXPLN` varchar(4000) DEFAULT NULL COMMENT '기능설명',
  `GDNTC` varchar(4000) DEFAULT NULL COMMENT '안내문',
  `ANS_YN` char(1) DEFAULT NULL COMMENT '답변 여부',
  `RCMDTN_YN` char(1) DEFAULT NULL COMMENT '추천 여부',
  `NEW_INDCT_CRTR` decimal(2,0) DEFAULT NULL COMMENT '최신표시기준',
  `PRVT_YN` char(1) DEFAULT NULL COMMENT '비공개 여부',
  `HGHRK_YN` char(1) DEFAULT NULL COMMENT '최상위 사용여부',
  `LGN_YN` char(1) DEFAULT NULL COMMENT '로그인여부',
  `CMNT_PSBLTY_YN` char(1) DEFAULT NULL COMMENT '댓글가능여부',
  `DDLN_YN` char(1) DEFAULT NULL COMMENT '마감일자여부',
  `PRSNTN_YN` char(1) DEFAULT 'N' COMMENT '발표 여부',
  `WRT_INST_YN` char(1) DEFAULT NULL COMMENT '작성기관명 여부',
  `GROUP_SCHL_YN` char(1) DEFAULT NULL COMMENT '그룹 학교 여부',
  `GROUP_CLS_YN` char(1) DEFAULT 'N' COMMENT '그룹학년반(종목)여부',
  `FILE_ATCH_PSBLTY_YN` char(1) DEFAULT NULL COMMENT '파일첨부가능여부',
  `PRM_FILE_EXTN` varchar(100) DEFAULT NULL COMMENT '허용파일확장자',
  `INDIV_ATCH_POSBL_FILE_SIZE` decimal(8,0) DEFAULT NULL COMMENT '개별첨부가능파일크기',
  `ATCH_POSBL_FILE_SIZE` decimal(8,0) DEFAULT NULL COMMENT '파일첨부가능크기',
  `ATCH_POSBL_FILE_NUMBER` decimal(2,0) DEFAULT NULL COMMENT '파일첨부가능갯수',
  `USER_JOIN_YN` char(1) DEFAULT 'N' COMMENT '사용자테이블 조인여부',
  `LGN_BFR_YN` char(1) DEFAULT NULL COMMENT '로그인 이전 가능 여부',
  `ANONYMOUS_RDR_YN` char(1) DEFAULT 'N' COMMENT '익명사용자 조회권한',
  `ANONYMOUS_WRTR_YN` char(1) DEFAULT 'N' COMMENT '익명사용자 쓰기권한',
  `ANONYMOUS_RPL_YN` char(1) DEFAULT 'N' COMMENT '익명사용자 답장권한',
  `ANONYMOUS_CMNT_YN` char(1) DEFAULT 'N' COMMENT '익명사용자 댓글권한',
  `USER_RDR_YN` char(1) DEFAULT 'Y' COMMENT '학생 조회',
  `USER_WRTR_YN` char(1) DEFAULT 'Y' COMMENT '학생 쓰기',
  `USER_RPL_YN` char(1) DEFAULT 'Y' COMMENT '학생 답장',
  `USER_CMNT_YN` char(1) DEFAULT 'Y' COMMENT '학생 댓글',
  `TEACH_RDR_YN` char(1) DEFAULT 'Y' COMMENT '교직원 조회',
  `TEACH_WRTR_YN` char(1) DEFAULT 'Y' COMMENT '교직원 쓰기',
  `TEACH_RPL_YN` char(1) DEFAULT 'Y' COMMENT '교직원 답장',
  `TEACH_CMNT_YN` char(1) DEFAULT 'Y' COMMENT '교직원 댓글',
  `DSCSN_YN` char(1) DEFAULT 'N' COMMENT '상담여부',
  `USE_YN` char(1) DEFAULT 'Y' COMMENT '사용여부',
  `DEL_YN` char(1) DEFAULT 'N' COMMENT '삭제구분',
  `DEL_DT` datetime DEFAULT NULL COMMENT '삭제일시',
  `DLTR_ID` varchar(50) DEFAULT NULL COMMENT '삭제자아이디',
  `DLTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '삭제자아이피주소',
  `DLTR_NM` varchar(100) DEFAULT NULL COMMENT '삭제자이름',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime DEFAULT NULL COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime DEFAULT NULL COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  `MNGR_ITEM_CNT` decimal(2,0) DEFAULT NULL COMMENT '관리자 품목 수',
  `SITE_ITEM_CNT` decimal(2,0) DEFAULT NULL COMMENT '사이트 품목 수',
  `CTGRY_USE_YN` char(1) DEFAULT NULL COMMENT '범주사용여부',
  PRIMARY KEY (`STNG_ID`),
  UNIQUE KEY `UK_TB_COM_BBS_STNG_01` (`STNG_SN`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='게시판 설정';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_CHAT_MSG`
--

DROP TABLE IF EXISTS `TB_COM_CHAT_MSG`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_CHAT_MSG` (
  `MSG_ID` varchar(50) NOT NULL COMMENT '메시지 ID',
  `ROOM_ID` varchar(50) NOT NULL COMMENT '채팅방 ID',
  `SNDR_USER_ID` varchar(50) NOT NULL COMMENT '발신자 사용자 ID',
  `MSG_CN` text COMMENT '메시지 내용',
  `SEND_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '발송일시',
  `USE_YN` char(1) NOT NULL DEFAULT 'Y' COMMENT '사용여부(Y/N)',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  PRIMARY KEY (`MSG_ID`),
  KEY `IDX_TB_COM_CHAT_MSG_01` (`ROOM_ID`),
  KEY `IDX_TB_COM_CHAT_MSG_02` (`SNDR_USER_ID`),
  CONSTRAINT `FK_TB_COM_CHAT_MSG_01` FOREIGN KEY (`ROOM_ID`) REFERENCES `TB_COM_CHAT_ROOM` (`ROOM_ID`),
  CONSTRAINT `FK_TB_COM_CHAT_MSG_02` FOREIGN KEY (`SNDR_USER_ID`) REFERENCES `TB_COM_USER` (`USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='채팅 메시지';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_CHAT_ROOM`
--

DROP TABLE IF EXISTS `TB_COM_CHAT_ROOM`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_CHAT_ROOM` (
  `ROOM_ID` varchar(50) NOT NULL COMMENT '채팅방 ID',
  `ROOM_TYPE_CD` char(1) NOT NULL DEFAULT 'D' COMMENT '방유형(D:DM, G:GROUP)',
  `LAST_MSG_ID` varchar(50) DEFAULT NULL COMMENT '마지막 메시지 ID',
  `LAST_MSG_CN` varchar(1000) DEFAULT NULL COMMENT '마지막 메시지 내용',
  `LAST_MSG_DT` datetime DEFAULT NULL COMMENT '마지막 메시지 일시',
  `USE_YN` char(1) NOT NULL DEFAULT 'Y' COMMENT '사용여부(Y/N)',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  PRIMARY KEY (`ROOM_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='채팅방';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_FILE_ULD`
--

DROP TABLE IF EXISTS `TB_COM_FILE_ULD`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_FILE_ULD` (
  `ATCH_FILE_ID` varchar(50) NOT NULL COMMENT '첨부파일아이디',
  `FILE_SN` decimal(22,0) NOT NULL COMMENT '파일일련번호',
  `ORGNL_FILE_NM` varchar(100) DEFAULT NULL COMMENT '원본파일명',
  `STRG_FILE_NM` varchar(100) DEFAULT NULL COMMENT '저장파일명',
  `CONTS_TYPE` varchar(100) DEFAULT NULL COMMENT '콘텐츠유형',
  `FILE_SZ` decimal(14,0) DEFAULT NULL COMMENT '첨부파일크기',
  `FILE_EXTN_NM` varchar(50) DEFAULT NULL COMMENT '첨부파일확장자',
  `FILE_PATH_NM` varchar(100) DEFAULT NULL COMMENT '첨부파일경로명',
  `DWNLD_CNT` decimal(10,0) DEFAULT '0' COMMENT '다운로드 수',
  `STRG_STNG_ID` varchar(30) DEFAULT NULL COMMENT '저장설정아이디',
  `FWK_ID` varchar(50) DEFAULT NULL COMMENT '기능아이디',
  `ACTN_ID` varchar(32) DEFAULT NULL COMMENT '동작아이디',
  `FRST_REG_DT` datetime DEFAULT NULL COMMENT '최초등록일시',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_IP_ADDR` varchar(15) DEFAULT NULL COMMENT '최초등록자IP주소',
  PRIMARY KEY (`ATCH_FILE_ID`,`FILE_SN`),
  KEY `STRG_STNG_ID` (`STRG_STNG_ID`),
  KEY `idx_cfu_01` (`ATCH_FILE_ID`),
  CONSTRAINT `TB_COM_FILE_ULD_ibfk_1` FOREIGN KEY (`STRG_STNG_ID`) REFERENCES `TB_SYS_FILE_STRG_STNG` (`STRG_STNG_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='공통게시판파일업로드';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_ITEM`
--

DROP TABLE IF EXISTS `TB_COM_ITEM`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_ITEM` (
  `ITEM_SN` bigint NOT NULL AUTO_INCREMENT COMMENT '아이템 일련번호',
  `ITEM_NM` varchar(40) DEFAULT NULL COMMENT '아이템 명',
  `ITEM_AMOUNT` bigint NOT NULL DEFAULT '0' COMMENT '아이템 가격',
  `ATCH_FILE_ID` varchar(50) NOT NULL COMMENT '첨부파일아이디',
  `USE_YN` char(1) NOT NULL DEFAULT 'Y' COMMENT '사용 여부',
  `ITEM_TYPE` varchar(1) DEFAULT NULL COMMENT '아이템 타입(N : 일반, T : 템플)',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime DEFAULT NULL COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime DEFAULT NULL COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  PRIMARY KEY (`ITEM_SN`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='아이템';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_NTCN`
--

DROP TABLE IF EXISTS `TB_COM_NTCN`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_NTCN` (
  `NTCN_NO` bigint NOT NULL COMMENT '알림번호',
  `USER_ID` varchar(50) NOT NULL COMMENT '사용자 아이디',
  `NTCN_SJ` varchar(200) NOT NULL COMMENT '알림 제목',
  `NTCN_CN` varchar(4000) DEFAULT NULL COMMENT '내용',
  `NOTI_TYPE_CD` varchar(50) NOT NULL COMMENT '알림유형코드',
  `SEND_TYPE_CD` varchar(50) DEFAULT 'PUSH' COMMENT '발송유형코드',
  `IS_READ` char(1) DEFAULT 'N' COMMENT '읽음여부(Y:읽음, N:안읽음)',
  `READ_TIME` datetime DEFAULT NULL COMMENT '읽은일시',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime DEFAULT NULL COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  PRIMARY KEY (`NTCN_NO`),
  KEY `IDX_TB_COM_NTCN_01` (`USER_ID`),
  CONSTRAINT `FK_TB_COM_NTCN_01` FOREIGN KEY (`USER_ID`) REFERENCES `TB_COM_USER` (`USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='알림';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_PAY_API_LOG`
--

DROP TABLE IF EXISTS `TB_COM_PAY_API_LOG`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_PAY_API_LOG` (
  `PAY_API_LOG_ID` varchar(50) NOT NULL COMMENT '결제API로그ID',
  `USER_ID` varchar(50) DEFAULT NULL COMMENT '사용자ID',
  `API_NM` varchar(50) NOT NULL COMMENT 'API명',
  `DLNG_UNQ_NO` varchar(50) DEFAULT NULL COMMENT '거래고유번호',
  `REQ_JSON` longtext COMMENT '요청JSON',
  `RES_JSON` longtext COMMENT '응답JSON',
  `RES_DECRYPT_JSON` longtext COMMENT '복호화응답JSON',
  `RESULT_CD` varchar(20) DEFAULT NULL COMMENT '처리결과코드',
  `RESULT_MSG` varchar(500) DEFAULT NULL COMMENT '처리결과메시지',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_REG_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  PRIMARY KEY (`PAY_API_LOG_ID`),
  KEY `IDX_TB_COM_PAY_API_LOG_01` (`DLNG_UNQ_NO`),
  KEY `IDX_TB_COM_PAY_API_LOG_02` (`USER_ID`,`FRST_REG_DT`),
  KEY `IDX_TB_COM_PAY_API_LOG_03` (`API_NM`,`FRST_REG_DT`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='결제API요청응답로그';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_PAY_LOG`
--

DROP TABLE IF EXISTS `TB_COM_PAY_LOG`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_PAY_LOG` (
  `USER_ID` varchar(50) NOT NULL COMMENT '결제 카드 ID',
  `DLNG_UNQ_NO` varchar(20) NOT NULL COMMENT '거래고유번호',
  `FRCS_NO` varchar(10) DEFAULT NULL COMMENT '가맹점번호',
  `AMOUNT` bigint DEFAULT '0' COMMENT '원 결제금액',
  `DLNG_DT` varchar(8) DEFAULT NULL COMMENT '결제 일자',
  `DLNG_TM` varchar(8) DEFAULT NULL COMMENT '결제 일시',
  `PAY_TYPE_CD` varchar(1) DEFAULT NULL COMMENT 'C : 충전, P : 사용, R : 환불',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime DEFAULT NULL COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  PRIMARY KEY (`USER_ID`,`DLNG_UNQ_NO`),
  KEY `IDX_TB_COM_PAY_LOG_01` (`USER_ID`,`DLNG_UNQ_NO`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='결제 API 로그';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_POCKET`
--

DROP TABLE IF EXISTS `TB_COM_POCKET`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_POCKET` (
  `PKT_SN` int NOT NULL AUTO_INCREMENT,
  `USER_ID` varchar(50) NOT NULL COMMENT '사용자 아이디',
  `STORE_NM` varchar(100) DEFAULT NULL COMMENT '사용처 명',
  `AMOUNT` int NOT NULL COMMENT '금액',
  `PKT_DV_CD` varchar(10) NOT NULL DEFAULT 'EXPENSE' COMMENT 'INCOME(수입) / EXPENSE(지출)',
  `SJ` varchar(100) DEFAULT NULL COMMENT '기입장 제목',
  `ATCH_FILE_ID` varchar(50) DEFAULT NULL COMMENT '첨부파일아이디',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime DEFAULT NULL COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime DEFAULT NULL COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  PRIMARY KEY (`PKT_SN`),
  KEY `IDX_TB_COM_POCKET_01` (`USER_ID`),
  CONSTRAINT `FK_TB_COM_POCKET_01` FOREIGN KEY (`USER_ID`) REFERENCES `TB_COM_USER` (`USER_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='용돈기입장';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_PTS_MALL_CATEGORY`
--

DROP TABLE IF EXISTS `TB_COM_PTS_MALL_CATEGORY`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_PTS_MALL_CATEGORY` (
  `CATEGORY_ID` varchar(50) NOT NULL COMMENT '지역상생몰 카테고리 ID',
  `CATEGORY_NM` varchar(100) NOT NULL COMMENT '카테고리명',
  `SORT_ORD` int NOT NULL DEFAULT '0' COMMENT '정렬순서',
  `USE_YN` char(1) NOT NULL DEFAULT 'Y' COMMENT '사용여부',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  PRIMARY KEY (`CATEGORY_ID`),
  KEY `IDX_TB_COM_PTS_MALL_CATEGORY_01` (`USE_YN`,`SORT_ORD`,`CATEGORY_NM`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='지역상생몰 카테고리';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_PTS_MALL_ORDER`
--

DROP TABLE IF EXISTS `TB_COM_PTS_MALL_ORDER`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_PTS_MALL_ORDER` (
  `ORDER_ID` varchar(50) NOT NULL COMMENT '지역상생몰 주문 ID',
  `BUYER_USER_ID` varchar(50) NOT NULL COMMENT '구매자 사용자 ID',
  `ORDER_TYPE_CD` varchar(20) NOT NULL COMMENT '주문유형코드(SELF/GIFT)',
  `ORDER_STTS_CD` varchar(20) NOT NULL COMMENT '주문상태코드(COMPLETED/PICKUP/CANCEL 등)',
  `DLNG_UNQ_NO` varchar(50) DEFAULT NULL COMMENT '연결 결제 ID',
  `PRODUCT_ID` varchar(50) NOT NULL COMMENT '상품 ID',
  `PRODUCT_NM` varchar(200) NOT NULL COMMENT '주문 당시 상품명',
  `MERCHANT_NO` varchar(50) NOT NULL COMMENT '주문 당시 바우처 가맹점 번호',
  `MERCHANT_NM` varchar(100) NOT NULL COMMENT '주문 당시 수령 가맹점명',
  `SALE_PRICE` bigint NOT NULL DEFAULT '0' COMMENT '판매가',
  `CHARGE_AMT` bigint NOT NULL DEFAULT '0' COMMENT '충전금 결제 금액',
  `SUPPORT_AMT` bigint NOT NULL DEFAULT '0' COMMENT '지원금 사용 금액',
  `PRIORITY_USE_AMT` bigint NOT NULL DEFAULT '0' COMMENT '우선사용 금액',
  `TOTAL_PAY_AMT` bigint NOT NULL DEFAULT '0' COMMENT '총 결제 금액',
  `QTY` int NOT NULL DEFAULT '1' COMMENT '수량',
  `RECEIVER_CNT` int NOT NULL DEFAULT '1' COMMENT '수령자 수',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  PRIMARY KEY (`ORDER_ID`),
  UNIQUE KEY `UK_TB_COM_PTS_MALL_ORDER_01` (`DLNG_UNQ_NO`),
  KEY `IDX_TB_COM_PTS_MALL_ORDER_01` (`BUYER_USER_ID`,`FRST_REG_DT`),
  KEY `IDX_TB_COM_PTS_MALL_ORDER_02` (`PRODUCT_ID`),
  KEY `IDX_TB_COM_PTS_MALL_ORDER_03` (`MERCHANT_NO`),
  CONSTRAINT `FK_TB_COM_PTS_MALL_ORDER_01` FOREIGN KEY (`BUYER_USER_ID`) REFERENCES `TB_COM_USER` (`USER_ID`),
  CONSTRAINT `FK_TB_COM_PTS_MALL_ORDER_02` FOREIGN KEY (`PRODUCT_ID`) REFERENCES `TB_COM_PTS_MALL_PRODUCT` (`PRODUCT_ID`),
  CONSTRAINT `FK_TB_COM_PTS_MALL_ORDER_03` FOREIGN KEY (`MERCHANT_NO`) REFERENCES `TB_COM_VOUCHER` (`MERCHANT_NO`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='지역상생몰 주문';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_PTS_MALL_ORDER_RCVR`
--

DROP TABLE IF EXISTS `TB_COM_PTS_MALL_ORDER_RCVR`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_PTS_MALL_ORDER_RCVR` (
  `ORDER_RCVR_ID` varchar(50) NOT NULL COMMENT '지역상생몰 주문 수령자 ID',
  `ORDER_ID` varchar(50) NOT NULL COMMENT '주문 ID',
  `SN` int NOT NULL DEFAULT '1' COMMENT '순번',
  `RCVR_USER_ID` varchar(50) DEFAULT NULL COMMENT '수령자 사용자 ID',
  `RCVR_USER_NM` varchar(100) DEFAULT NULL COMMENT '수령자명',
  `DM_ROOM_ID` varchar(50) DEFAULT NULL COMMENT 'DM 채팅방 ID',
  `DM_MSG_ID` varchar(50) DEFAULT NULL COMMENT 'DM 메시지 ID',
  `PICKUP_CFM_YN` char(1) NOT NULL DEFAULT 'N' COMMENT '수령확인여부',
  `REVIEW_WRIT_YN` char(1) NOT NULL DEFAULT 'N' COMMENT '리뷰작성여부',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  PRIMARY KEY (`ORDER_RCVR_ID`),
  UNIQUE KEY `UK_TB_COM_PTS_MALL_ORDER_RCVR_01` (`ORDER_ID`,`SN`),
  KEY `IDX_TB_COM_PTS_MALL_ORDER_RCVR_02` (`RCVR_USER_ID`),
  KEY `IDX_TB_COM_PTS_MALL_ORDER_RCVR_03` (`DM_ROOM_ID`),
  CONSTRAINT `FK_TB_COM_PTS_MALL_ORDER_RCVR_01` FOREIGN KEY (`ORDER_ID`) REFERENCES `TB_COM_PTS_MALL_ORDER` (`ORDER_ID`),
  CONSTRAINT `FK_TB_COM_PTS_MALL_ORDER_RCVR_02` FOREIGN KEY (`RCVR_USER_ID`) REFERENCES `TB_COM_USER` (`USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='지역상생몰 주문 수령자';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_PTS_MALL_PRODUCT`
--

DROP TABLE IF EXISTS `TB_COM_PTS_MALL_PRODUCT`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_PTS_MALL_PRODUCT` (
  `PRODUCT_ID` varchar(50) NOT NULL COMMENT '지역상생몰 상품 ID',
  `CATEGORY_ID` varchar(50) NOT NULL COMMENT '카테고리 ID',
  `MERCHANT_NO` varchar(50) NOT NULL COMMENT '바우처 가맹점 번호',
  `PRODUCT_NM` varchar(200) NOT NULL COMMENT '상품명',
  `PRODUCT_SUMRY` varchar(500) DEFAULT NULL COMMENT '상품 요약',
  `DETAIL_CN` text COMMENT '상품 상세 설명',
  `THUMB_IMG_URL` varchar(500) DEFAULT NULL COMMENT '썸네일 이미지 URL',
  `TEMP_IMG_URL` varchar(500) DEFAULT NULL COMMENT '상세 상단 대표 이미지 URL',
  `DETAIL_IMG_URL` varchar(2000) DEFAULT NULL COMMENT '상세 본문 이미지 URL 목록(, 구분)',
  `SALE_PRICE` bigint NOT NULL DEFAULT '0' COMMENT '판매가',
  `STOCK_QTY` int NOT NULL DEFAULT '0' COMMENT '재고 수량',
  `RATING_AVG` decimal(3,2) NOT NULL DEFAULT '0.00' COMMENT '평균 별점',
  `RATING_CNT` int NOT NULL DEFAULT '0' COMMENT '별점 수',
  `GIFT_CNT` int NOT NULL DEFAULT '0' COMMENT '선물 횟수',
  `EXPOSE_YN` char(1) NOT NULL DEFAULT 'Y' COMMENT '노출 여부',
  `SALE_BGNG_DT` datetime DEFAULT NULL COMMENT '판매 시작일시',
  `SALE_END_DT` datetime DEFAULT NULL COMMENT '판매 종료일시',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  PRIMARY KEY (`PRODUCT_ID`),
  KEY `IDX_TB_COM_PTS_MALL_PRODUCT_01` (`CATEGORY_ID`,`EXPOSE_YN`,`FRST_REG_DT`),
  KEY `IDX_TB_COM_PTS_MALL_PRODUCT_03` (`EXPOSE_YN`,`SALE_BGNG_DT`,`SALE_END_DT`),
  KEY `IDX_TB_COM_PTS_MALL_PRODUCT_02` (`MERCHANT_NO`),
  CONSTRAINT `FK_TB_COM_PTS_MALL_PRODUCT_01` FOREIGN KEY (`CATEGORY_ID`) REFERENCES `TB_COM_PTS_MALL_CATEGORY` (`CATEGORY_ID`),
  CONSTRAINT `FK_TB_COM_PTS_MALL_PRODUCT_02` FOREIGN KEY (`MERCHANT_NO`) REFERENCES `TB_COM_VOUCHER` (`MERCHANT_NO`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='지역상생몰 상품';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_PTS_MALL_REVIEW`
--

DROP TABLE IF EXISTS `TB_COM_PTS_MALL_REVIEW`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_PTS_MALL_REVIEW` (
  `REVIEW_ID` varchar(50) NOT NULL COMMENT '지역상생몰 리뷰 ID',
  `ORDER_RCVR_ID` varchar(50) NOT NULL COMMENT '주문 수령자 ID',
  `PRODUCT_ID` varchar(50) NOT NULL COMMENT '상품 ID',
  `WRTR_USER_ID` varchar(50) NOT NULL COMMENT '작성자 사용자 ID',
  `SCORE` int NOT NULL COMMENT '별점',
  `REVIEW_CN` varchar(1000) DEFAULT NULL COMMENT '리뷰 내용',
  `USE_YN` char(1) NOT NULL DEFAULT 'Y' COMMENT '사용여부',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  PRIMARY KEY (`REVIEW_ID`),
  UNIQUE KEY `UK_TB_COM_PTS_MALL_REVIEW_01` (`ORDER_RCVR_ID`),
  KEY `IDX_TB_COM_PTS_MALL_REVIEW_02` (`PRODUCT_ID`,`USE_YN`),
  KEY `IDX_TB_COM_PTS_MALL_REVIEW_03` (`WRTR_USER_ID`),
  CONSTRAINT `FK_TB_COM_PTS_MALL_REVIEW_01` FOREIGN KEY (`ORDER_RCVR_ID`) REFERENCES `TB_COM_PTS_MALL_ORDER_RCVR` (`ORDER_RCVR_ID`),
  CONSTRAINT `FK_TB_COM_PTS_MALL_REVIEW_02` FOREIGN KEY (`PRODUCT_ID`) REFERENCES `TB_COM_PTS_MALL_PRODUCT` (`PRODUCT_ID`),
  CONSTRAINT `FK_TB_COM_PTS_MALL_REVIEW_03` FOREIGN KEY (`WRTR_USER_ID`) REFERENCES `TB_COM_USER` (`USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='지역상생몰 리뷰';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_SKIN`
--

DROP TABLE IF EXISTS `TB_COM_SKIN`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_SKIN` (
  `SKIN_TYPE` char(1) NOT NULL COMMENT '스킨 타입',
  `SKIN_AMOUNT` bigint NOT NULL DEFAULT '0' COMMENT '스킨 가격',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime DEFAULT NULL COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  PRIMARY KEY (`SKIN_TYPE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='스킨 아이템';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_USER`
--

DROP TABLE IF EXISTS `TB_COM_USER`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_USER` (
  `USER_ID` varchar(50) NOT NULL COMMENT '사용자 아이디',
  `USER_NM` varchar(100) DEFAULT NULL COMMENT '사용자명',
  `USER_TELNO` varchar(30) DEFAULT NULL COMMENT '사용자전화번호',
  `USER_EML_ADDR` varchar(300) DEFAULT NULL COMMENT '사용자이메일주소',
  `USER_TYPE` varchar(10) NOT NULL COMMENT 'STUDENT/PARENT/TEACHER',
  `LOGIN_ID` varchar(100) NOT NULL COMMENT '로그인 아이디',
  `LOGIN_PW` varchar(255) NOT NULL COMMENT '로그인 비밀번호',
  `SCH_NM` varchar(100) DEFAULT NULL COMMENT '학교명',
  `GRADE` varchar(3) DEFAULT NULL COMMENT '학년',
  `CLS_NO` varchar(5) DEFAULT NULL COMMENT '반',
  `IMG_ATCH_FILE_ID` varchar(50) DEFAULT NULL COMMENT '이미지',
  `SKIN_TYPE` varchar(3) DEFAULT 'A' COMMENT '스킨 타입',
  `ITEM_TYPE` varchar(3) DEFAULT NULL COMMENT '아이템 타입',
  `LIKE_NO` bigint DEFAULT '0' COMMENT '좋아요 갯수',
  `SIMPLE_PW` varchar(50) DEFAULT NULL,
  `CERT_ID` varchar(20) DEFAULT NULL COMMENT '인증 코드',
  `FRST_LGN_DT` datetime DEFAULT NULL COMMENT '최초로그인일시',
  `LAST_LGN_DT` datetime DEFAULT NULL COMMENT '최종로그인일시',
  `PSWD_CHG_DT` datetime DEFAULT NULL COMMENT '비밀번호 변경 일시',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `FRST_REG_DT` datetime DEFAULT NULL COMMENT '최초등록일시',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  `LAST_MDFCN_DT` datetime DEFAULT NULL COMMENT '최종수정일시',
  `PROFILE_ATCH_FILE_ID` varchar(50) DEFAULT NULL COMMENT '회원 프로필 이미지',
  `birth` varchar(8) DEFAULT NULL,
  `NTCN_YN` char(1) DEFAULT NULL COMMENT '알림 수신 여부',
  `FCM_TOKEN` varchar(200) DEFAULT NULL COMMENT '푸쉬 아이디',
  PRIMARY KEY (`USER_ID`),
  UNIQUE KEY `UK_TB_COM_USER_01` (`LOGIN_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='사용자';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_USER_CARD`
--

DROP TABLE IF EXISTS `TB_COM_USER_CARD`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_USER_CARD` (
  `CARD_ID` varchar(50) NOT NULL COMMENT '카드 아이디',
  `USER_ID` varchar(50) NOT NULL COMMENT '사용자 아이디',
  `ACCOUNT_ID` varchar(50) NOT NULL COMMENT '계좌 아이디',
  `CARD_NM` varchar(100) DEFAULT NULL COMMENT '카드명',
  `BANK_CD` varchar(10) DEFAULT NULL COMMENT '은행코드 (NH:농협, SH:신한 등)',
  `CARD_KIND_CD` varchar(50) DEFAULT NULL COMMENT '카드종류코드 (PREPAID:선불, CREDIT:신용, CHECK:체크)',
  `MASKED_CARD_NO` varchar(30) DEFAULT NULL COMMENT '카드번호(마스킹)',
  `MAIN_CARD_YN` char(1) NOT NULL DEFAULT 'N' COMMENT '대표카드여부(Y/N)',
  `USE_YN` char(1) NOT NULL DEFAULT 'Y' COMMENT '사용여부(Y/N)',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  `BALANCE_AMT` bigint NOT NULL DEFAULT '0' COMMENT '카드잔액',
  `MAX_BALANCE_AMT` bigint NOT NULL DEFAULT '500000' COMMENT '카드한도금',
  `BALANCE_UPD_DT` datetime DEFAULT NULL COMMENT '카드잔액수정일시',
  PRIMARY KEY (`CARD_ID`),
  KEY `IDX_TB_COM_USER_CARD_01` (`USER_ID`),
  KEY `IDX_TB_COM_USER_CARD_02` (`ACCOUNT_ID`),
  CONSTRAINT `FK_TB_COM_USER_CARD_01` FOREIGN KEY (`USER_ID`) REFERENCES `TB_COM_USER` (`USER_ID`),
  CONSTRAINT `FK_TB_COM_USER_CARD_02` FOREIGN KEY (`ACCOUNT_ID`) REFERENCES `TB_COM_ACCOUNT` (`ACCOUNT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='회원 카드 정보';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_USER_ITEM`
--

DROP TABLE IF EXISTS `TB_COM_USER_ITEM`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_USER_ITEM` (
  `ITEM_SN` bigint NOT NULL COMMENT '아이템 일련번호',
  `USER_ID` varchar(50) NOT NULL COMMENT '사용자 아이디',
  `APPLC_AT` char(1) NOT NULL DEFAULT 'N' COMMENT '적용 여부',
  `LOC_X` double NOT NULL COMMENT '아이템 좌표X',
  `LOC_Y` double NOT NULL COMMENT '아이템 좌표Y',
  `SCALE` double NOT NULL COMMENT '아이템 스케일',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime DEFAULT NULL COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  PRIMARY KEY (`ITEM_SN`,`USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='사용자 아이템 목록';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_USER_POINT`
--

DROP TABLE IF EXISTS `TB_COM_USER_POINT`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_USER_POINT` (
  `USER_ID` varchar(50) NOT NULL COMMENT '사용자 아이디',
  `CURRENT_POINT` int NOT NULL DEFAULT '0' COMMENT '현재 보유 포인트 잔액',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime DEFAULT NULL COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime DEFAULT NULL COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  PRIMARY KEY (`USER_ID`),
  CONSTRAINT `FK_TB_COM_USER_POINT_01` FOREIGN KEY (`USER_ID`) REFERENCES `TB_COM_USER` (`USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='사용자 포인트';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_USER_POINT_LOG`
--

DROP TABLE IF EXISTS `TB_COM_USER_POINT_LOG`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_USER_POINT_LOG` (
  `POINT_SN` bigint NOT NULL COMMENT '포인트 로그 일련번호',
  `USER_ID` varchar(50) NOT NULL COMMENT '사용자 아이디',
  `POINT_SJ` varchar(200) NOT NULL COMMENT '내역 제목',
  `POINT_CN` varchar(4000) DEFAULT NULL COMMENT '내역 상세 설명',
  `POINT_AMT` int NOT NULL COMMENT '변동 포인트',
  `POINT_TYPE_CD` varchar(10) NOT NULL COMMENT '거래 구분 (E:적립, S:사용)',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime DEFAULT NULL COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime DEFAULT NULL COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  PRIMARY KEY (`POINT_SN`),
  KEY `IDX_TB_COM_USER_POINT_LOG_01` (`USER_ID`),
  CONSTRAINT `FK_TB_COM_USER_POINT_LOG_01` FOREIGN KEY (`USER_ID`) REFERENCES `TB_COM_USER` (`USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='사용자 포인트 로그';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_USER_SKIN`
--

DROP TABLE IF EXISTS `TB_COM_USER_SKIN`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_USER_SKIN` (
  `USER_ID` varchar(50) NOT NULL COMMENT '사용자 아이디',
  `SKIN_TYPE` char(1) NOT NULL COMMENT '스킨 타입',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime DEFAULT NULL COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  PRIMARY KEY (`USER_ID`,`SKIN_TYPE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='사용자 스킨 목록';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_COM_VOUCHER`
--

DROP TABLE IF EXISTS `TB_COM_VOUCHER`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_COM_VOUCHER` (
  `MERCHANT_NO` varchar(20) NOT NULL COMMENT '가맹점번호',
  `MERCHANT_NM` varchar(100) NOT NULL COMMENT '가맹점명',
  `VOUCHER_SE_NM` varchar(50) DEFAULT NULL COMMENT '구분',
  `LOCAL_GOV_NM` varchar(150) DEFAULT NULL COMMENT '지자체',
  `VOUCHER_STTS_NM` varchar(20) DEFAULT NULL COMMENT '상태',
  `USE_YN` char(1) NOT NULL DEFAULT 'Y' COMMENT '사용 여부',
  `ADDR` varchar(300) DEFAULT NULL COMMENT '주소',
  `BIZ_NO` varchar(20) DEFAULT NULL COMMENT '사업자번호',
  `MOBILE_NO` varchar(20) DEFAULT NULL COMMENT '휴대폰번호',
  `TEL_NO` varchar(20) DEFAULT NULL COMMENT '전화번호',
  `BIZ_TYPE_NM` varchar(100) DEFAULT NULL COMMENT '업태',
  `BIZ_ITEM_NM` varchar(100) DEFAULT NULL COMMENT '종목',
  `JOIN_YMD` char(8) DEFAULT NULL COMMENT '가입일',
  `TERMINATION_YMD` char(8) DEFAULT NULL COMMENT '해약일',
  `REPRESENTATIVE_NM` varchar(50) DEFAULT NULL COMMENT '대표자명',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  PRIMARY KEY (`MERCHANT_NO`),
  KEY `IDX_TB_COM_VOUCHER_02` (`LOCAL_GOV_NM`),
  KEY `IDX_TB_COM_VOUCHER_03` (`VOUCHER_STTS_NM`),
  KEY `IDX_TB_COM_VOUCHER_01` (`USE_YN`,`MERCHANT_NM`),
  KEY `IDX_TB_COM_VOUCHER_04` (`VOUCHER_STTS_NM`,`MERCHANT_NM`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='바우처 가맹점 정보';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_PMT_DECOR_ITEM`
--

DROP TABLE IF EXISTS `TB_PMT_DECOR_ITEM`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_PMT_DECOR_ITEM` (
  `ITEM_ID` varchar(50) NOT NULL COMMENT '꾸미기 아이템 ID',
  `ITEM_NM` varchar(100) NOT NULL COMMENT '아이템명',
  `ITEM_GROUP_CD` varchar(20) NOT NULL COMMENT '아이템 그룹 코드(SET/SINGLE)',
  `DISPLAY_TYPE_CD` varchar(20) NOT NULL COMMENT '노출 타입(CARD/ICON)',
  `SKIN_TYPE` varchar(50) DEFAULT NULL COMMENT 'TB_COM_USER.SKIN_TYPE 연동값',
  `ITEM_TYPE` varchar(50) DEFAULT NULL COMMENT 'TB_COM_USER.ITEM_TYPE 연동값',
  `THUMB_FILE_PATH` varchar(255) NOT NULL COMMENT '목록 썸네일 경로',
  `PREVIEW_FILE_PATH` varchar(255) NOT NULL COMMENT '상세 미리보기 경로',
  `POINT_COST` int NOT NULL DEFAULT '0' COMMENT '구매 포인트',
  `SORT_ORDR` int NOT NULL DEFAULT '0' COMMENT '정렬순서',
  `DEFAULT_OWNED_YN` char(1) NOT NULL DEFAULT 'N' COMMENT '기본 지급 여부(Y/N)',
  `USE_YN` char(1) NOT NULL DEFAULT 'Y' COMMENT '사용여부(Y/N)',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  PRIMARY KEY (`ITEM_ID`),
  KEY `IDX_TB_PMT_DECOR_ITEM_01` (`ITEM_GROUP_CD`,`USE_YN`,`SORT_ORDR`),
  KEY `IDX_TB_PMT_DECOR_ITEM_02` (`DISPLAY_TYPE_CD`,`USE_YN`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='PMT 앱카드 꾸미기 아이템 마스터';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_PMT_DECOR_PURCHASE_LOG`
--

DROP TABLE IF EXISTS `TB_PMT_DECOR_PURCHASE_LOG`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_PMT_DECOR_PURCHASE_LOG` (
  `PURCHASE_ID` varchar(50) NOT NULL COMMENT '구매 로그 ID',
  `USER_ID` varchar(50) NOT NULL COMMENT '사용자 ID',
  `ITEM_ID` varchar(50) NOT NULL COMMENT '꾸미기 아이템 ID',
  `USER_ITEM_ID` varchar(50) DEFAULT NULL COMMENT '사용자 꾸미기 아이템 ID',
  `POINT_LOG_SN` bigint DEFAULT NULL COMMENT '포인트 차감 로그 SN',
  `POINT_COST` int NOT NULL COMMENT '차감 포인트',
  `POINT_BALANCE_BEFR` int DEFAULT NULL COMMENT '차감 전 포인트',
  `POINT_BALANCE_AFTR` int DEFAULT NULL COMMENT '차감 후 포인트',
  `PURCHASE_STATUS_CD` varchar(20) NOT NULL DEFAULT 'SUCCESS' COMMENT '구매 상태 코드(SUCCESS/FAIL)',
  `FAIL_REASON_CN` varchar(500) DEFAULT NULL COMMENT '실패 사유',
  `USE_YN` char(1) NOT NULL DEFAULT 'Y' COMMENT '사용여부(Y/N)',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  PRIMARY KEY (`PURCHASE_ID`),
  KEY `IDX_TB_PMT_DECOR_PURCHASE_LOG_01` (`USER_ID`,`FRST_REG_DT`),
  KEY `IDX_TB_PMT_DECOR_PURCHASE_LOG_02` (`ITEM_ID`,`FRST_REG_DT`),
  KEY `IDX_TB_PMT_DECOR_PURCHASE_LOG_03` (`USER_ITEM_ID`),
  CONSTRAINT `FK_TB_PMT_DECOR_PURCHASE_LOG_01` FOREIGN KEY (`USER_ID`) REFERENCES `TB_COM_USER` (`USER_ID`),
  CONSTRAINT `FK_TB_PMT_DECOR_PURCHASE_LOG_02` FOREIGN KEY (`ITEM_ID`) REFERENCES `TB_PMT_DECOR_ITEM` (`ITEM_ID`),
  CONSTRAINT `FK_TB_PMT_DECOR_PURCHASE_LOG_03` FOREIGN KEY (`USER_ITEM_ID`) REFERENCES `TB_PMT_DECOR_USER_ITEM` (`USER_ITEM_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='PMT 앱카드 꾸미기 구매 로그';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_PMT_DECOR_USER_ITEM`
--

DROP TABLE IF EXISTS `TB_PMT_DECOR_USER_ITEM`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_PMT_DECOR_USER_ITEM` (
  `USER_ITEM_ID` varchar(50) NOT NULL COMMENT '사용자 꾸미기 아이템 ID',
  `USER_ID` varchar(50) NOT NULL COMMENT '사용자 ID',
  `ITEM_ID` varchar(50) NOT NULL COMMENT '꾸미기 아이템 ID',
  `OWNED_YN` char(1) NOT NULL DEFAULT 'Y' COMMENT '보유 여부(Y/N)',
  `APPLIED_YN` char(1) NOT NULL DEFAULT 'N' COMMENT '적용 여부(Y/N)',
  `PURCHASE_POINT_AMT` int NOT NULL DEFAULT '0' COMMENT '구매 사용 포인트',
  `PURCHASE_DT` datetime DEFAULT NULL COMMENT '구매일시',
  `LAST_APPLY_DT` datetime DEFAULT NULL COMMENT '최종 적용일시',
  `USE_YN` char(1) NOT NULL DEFAULT 'Y' COMMENT '사용여부(Y/N)',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  PRIMARY KEY (`USER_ITEM_ID`),
  UNIQUE KEY `UK_TB_PMT_DECOR_USER_ITEM_01` (`USER_ID`,`ITEM_ID`),
  KEY `IDX_TB_PMT_DECOR_USER_ITEM_01` (`USER_ID`,`OWNED_YN`,`USE_YN`),
  KEY `IDX_TB_PMT_DECOR_USER_ITEM_02` (`USER_ID`,`APPLIED_YN`,`USE_YN`),
  KEY `IDX_TB_PMT_DECOR_USER_ITEM_03` (`ITEM_ID`,`USE_YN`),
  CONSTRAINT `FK_TB_PMT_DECOR_USER_ITEM_01` FOREIGN KEY (`USER_ID`) REFERENCES `TB_COM_USER` (`USER_ID`),
  CONSTRAINT `FK_TB_PMT_DECOR_USER_ITEM_02` FOREIGN KEY (`ITEM_ID`) REFERENCES `TB_PMT_DECOR_ITEM` (`ITEM_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='PMT 사용자별 꾸미기 아이템 보유/적용';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_SID_RANK_LIKE`
--

DROP TABLE IF EXISTS `TB_SID_RANK_LIKE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_SID_RANK_LIKE` (
  `LIKE_ID` varchar(50) NOT NULL COMMENT '랭킹 좋아요 ID',
  `USER_ID` varchar(50) NOT NULL COMMENT '좋아요 사용자 ID',
  `TARGET_USER_ID` varchar(50) NOT NULL COMMENT '좋아요 대상 사용자 ID',
  `USE_YN` char(1) NOT NULL DEFAULT 'Y' COMMENT '사용여부(Y/N)',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_REG_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최초등록일시',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFCN_DT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '최종수정일시',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  PRIMARY KEY (`LIKE_ID`),
  UNIQUE KEY `UK_TB_SID_RANK_LIKE_01` (`USER_ID`,`TARGET_USER_ID`),
  KEY `IDX_TB_SID_RANK_LIKE_01` (`TARGET_USER_ID`,`USE_YN`),
  CONSTRAINT `FK_TB_SID_RANK_LIKE_01` FOREIGN KEY (`USER_ID`) REFERENCES `TB_COM_USER` (`USER_ID`),
  CONSTRAINT `FK_TB_SID_RANK_LIKE_02` FOREIGN KEY (`TARGET_USER_ID`) REFERENCES `TB_COM_USER` (`USER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='꾸미기 랭킹 좋아요';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_SYS_COM_CD`
--

DROP TABLE IF EXISTS `TB_SYS_COM_CD`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_SYS_COM_CD` (
  `COM_CD` varchar(20) NOT NULL COMMENT '공통 코드',
  `CD_NM` varchar(50) DEFAULT NULL COMMENT '코드아이디명(한글)',
  `CD_EXPLN` varchar(4000) DEFAULT NULL COMMENT '공통코드설명',
  `ATRB_NM1` varchar(100) DEFAULT NULL COMMENT '속성명1',
  `DEL_DT` datetime DEFAULT NULL COMMENT '삭제일시',
  `DEL_YN` char(1) DEFAULT NULL COMMENT '삭제구분',
  `DLTR_ID` varchar(50) DEFAULT NULL COMMENT '삭제자아이디',
  `DLTR_NM` varchar(100) DEFAULT NULL COMMENT '삭제자이름',
  `DLTR_IP_ADDR` varchar(15) DEFAULT NULL COMMENT '삭제자아이피주소',
  `USE_YN` char(1) DEFAULT NULL COMMENT '사용 여부',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_RGTR_IP_ADDR` varchar(15) DEFAULT NULL COMMENT '최초등록자IP주소',
  `FRST_REG_DT` datetime DEFAULT NULL COMMENT '최초등록일시',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아아디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFR_IP_ADDR` varchar(15) DEFAULT NULL COMMENT '최종수정자IP주소',
  `LAST_MDFCN_DT` datetime DEFAULT NULL COMMENT '최종수정일시',
  PRIMARY KEY (`COM_CD`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='시스템 공통 코드';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_SYS_COM_CD_DTL`
--

DROP TABLE IF EXISTS `TB_SYS_COM_CD_DTL`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_SYS_COM_CD_DTL` (
  `COM_CD` varchar(20) NOT NULL COMMENT '공통 코드',
  `COM_DTL_CD` varchar(30) NOT NULL COMMENT '공통 상세 코드',
  `CD_NM` varchar(100) DEFAULT NULL COMMENT '코드명',
  `DTL_CD_EXPLN` varchar(4000) DEFAULT NULL COMMENT '상세코드설명',
  `ATRB_NM1` varchar(100) DEFAULT NULL COMMENT '속성명(1)',
  `SORT_SEQ` decimal(10,0) DEFAULT NULL COMMENT '정렬순서',
  `DEL_DT` datetime DEFAULT NULL COMMENT '삭제일시',
  `DEL_YN` char(1) DEFAULT NULL COMMENT '삭제구분',
  `DLTR_ID` varchar(50) DEFAULT NULL COMMENT '삭제자아이디',
  `DLTR_NM` varchar(100) DEFAULT NULL COMMENT '삭제자이름',
  `DLTR_IP_ADDR` varchar(15) DEFAULT NULL COMMENT '삭제자아이피주소',
  `USE_YN` char(1) DEFAULT NULL COMMENT '사용 여부',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_RGTR_IP_ADDR` varchar(15) DEFAULT NULL COMMENT '최초등록자IP주소',
  `FRST_REG_DT` datetime DEFAULT NULL COMMENT '최초등록일시',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아아디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFR_IP_ADDR` varchar(15) DEFAULT NULL COMMENT '최종수정자IP주소',
  `LAST_MDFCN_DT` datetime DEFAULT NULL COMMENT '최종수정일시',
  PRIMARY KEY (`COM_CD`,`COM_DTL_CD`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='시스템공통코드상세';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_SYS_FILE_STRG_STNG`
--

DROP TABLE IF EXISTS `TB_SYS_FILE_STRG_STNG`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_SYS_FILE_STRG_STNG` (
  `STRG_STNG_ID` varchar(30) NOT NULL COMMENT '저장설정아이디',
  `STRG_STNG_NM` varchar(100) DEFAULT NULL COMMENT '저장설정명',
  `PRM_FILE_EXTN` varchar(100) DEFAULT NULL COMMENT '허용파일확장자명',
  `INDIV_ATCH_POSBL_FILE_SIZE` decimal(8,0) DEFAULT NULL COMMENT '개별첨부가능파일크기',
  `ATCH_POSBL_FILE_SIZE` decimal(8,0) DEFAULT NULL COMMENT '파일첨부가능크기',
  `ATCH_POSBL_FILE_NUMBER` decimal(2,0) DEFAULT NULL COMMENT '파일첨부가능갯수',
  `STRG_FLDR` varchar(100) DEFAULT NULL COMMENT '저장 디렉토리',
  `ORGNL_FILE_NM_STRG_YN` char(1) DEFAULT NULL COMMENT '원본 파일명 저장 여부',
  `ROOT_FLDR_USE_YN` char(1) DEFAULT NULL COMMENT '루트폴더사용여부',
  `FWK_EXPLN` varchar(4000) DEFAULT NULL COMMENT '기능설명',
  `USE_YN` char(1) DEFAULT NULL COMMENT '사용 여부',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_RGTR_IP_ADDR` varchar(15) DEFAULT NULL COMMENT '최초등록자IP주소',
  `FRST_REG_DT` datetime DEFAULT NULL COMMENT '최초등록일시',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아아디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFR_IP_ADDR` varchar(15) DEFAULT NULL COMMENT '최종수정자IP주소',
  `LAST_MDFCN_DT` datetime DEFAULT NULL COMMENT '최종수정일시',
  PRIMARY KEY (`STRG_STNG_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='시스템파일저장설정';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TB_SYS_MENU`
--

DROP TABLE IF EXISTS `TB_SYS_MENU`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TB_SYS_MENU` (
  `MENU_ID` varchar(50) NOT NULL COMMENT '메뉴아이디',
  `UP_MENU_ID` varchar(50) DEFAULT NULL COMMENT '상위메뉴아이디',
  `MENU_NAME` varchar(100) NOT NULL COMMENT '메뉴명',
  `MENU_ID_PATH` varchar(100) NOT NULL COMMENT '메뉴아이디경로',
  `MENU_ICON` varchar(50) DEFAULT NULL COMMENT '메뉴아이콘',
  `TEACH_YN` char(1) DEFAULT NULL COMMENT '교사 여부',
  `STDT_YN` char(1) DEFAULT NULL COMMENT '학생 여부',
  `USE_YN` char(1) DEFAULT 'Y',
  `FRST_RGTR_ID` varchar(50) DEFAULT NULL COMMENT '최초등록자아이디',
  `FRST_RGTR_NM` varchar(100) DEFAULT NULL COMMENT '최초등록자명',
  `FRST_RGTR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최초등록자IP주소',
  `FRST_REG_DT` datetime DEFAULT NULL COMMENT '최초등록일시',
  `LAST_MDFR_ID` varchar(50) DEFAULT NULL COMMENT '최종수정자아이디',
  `LAST_MDFR_NM` varchar(100) DEFAULT NULL COMMENT '최종수정자명',
  `LAST_MDFR_IP_ADDR` varchar(45) DEFAULT NULL COMMENT '최종수정자IP주소',
  PRIMARY KEY (`MENU_ID`),
  KEY `IDX_TB_SYS_MENU_01` (`UP_MENU_ID`),
  CONSTRAINT `FK_TB_SYS_MENU_01` FOREIGN KEY (`UP_MENU_ID`) REFERENCES `TB_SYS_MENU` (`MENU_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='시스템 메뉴';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'edupay_db'
--
