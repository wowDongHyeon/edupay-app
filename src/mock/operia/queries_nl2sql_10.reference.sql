-- =====================================================
-- FOX PAY 질의 10종 — NL2SQL 정형 패턴 쿼리
-- 대상: edupay_db (_DEV 테이블 직접) / 권한 JOIN 미포함
-- 패턴: 사전집계(__pre_agg_*) → 재집계 → 외부 SELECT + NULL후순위 ORDER BY [+ LIMIT]
-- 필터는 리터럴(예: USER_ID='USR131', 월='202606')로 표기
-- =====================================================
USE `edupay_db`;

-- =====================================================
-- 1-1. 월별 사용 추이 (measure: SUM 사용액 / dim: 월)
-- =====================================================
SELECT
    month,
    sum_pay_dlng_amt
FROM (
    SELECT
        pay.month AS month,
        SUM(pay.__pre_agg_sum_pay_dlng_amt) AS sum_pay_dlng_amt
    FROM (
        SELECT
            LEFT(DLNG_DT, 6) AS month,
            SUM(DLNG_AMT) AS __pre_agg_sum_pay_dlng_amt
        FROM TB_COM_PAY_APRV_DEV
        WHERE USER_ID = 'USR131'
        GROUP BY LEFT(DLNG_DT, 6)
    ) AS pay
    GROUP BY pay.month
) AS agg
ORDER BY
    month ASC;

-- =====================================================
-- 1-2. 결제수단별 합계 (measure: SUM 금액 / dim: 결제수단)
-- =====================================================
SELECT
    pay_mean_cd,
    sum_pay_dlng_amt
FROM (
    SELECT
        pay.pay_mean_cd AS pay_mean_cd,
        SUM(pay.__pre_agg_sum_pay_dlng_amt) AS sum_pay_dlng_amt
    FROM (
        SELECT
            PAY_MEAN_CD AS pay_mean_cd,
            SUM(DLNG_AMT) AS __pre_agg_sum_pay_dlng_amt
        FROM TB_COM_PAY_APRV_DEV
        WHERE USER_ID = 'USR131'
        GROUP BY PAY_MEAN_CD
    ) AS pay
    GROUP BY pay.pay_mean_cd
) AS agg
ORDER BY
    sum_pay_dlng_amt DESC;

-- =====================================================
-- 2. 사용처별 내역 (measure: SUM 금액 / dim: 가맹점명)
-- =====================================================
SELECT
    merchant_nm,
    sum_pay_dlng_amt
FROM (
    SELECT
        pay.merchant_nm AS merchant_nm,
        SUM(pay.__pre_agg_sum_pay_dlng_amt) AS sum_pay_dlng_amt
    FROM (
        SELECT
            v.MERCHANT_NM AS merchant_nm,
            SUM(p.DLNG_AMT) AS __pre_agg_sum_pay_dlng_amt
        FROM TB_COM_PAY_APRV_DEV p
        INNER JOIN TB_COM_VOUCHER_DEV v ON v.MERCHANT_NO = p.FRCS_NO
        WHERE p.USER_ID = 'USR131'
        GROUP BY v.MERCHANT_NM
    ) AS pay
    GROUP BY pay.merchant_nm
) AS agg
ORDER BY
    sum_pay_dlng_amt DESC;

-- =====================================================
-- 3. 친구랑 사용 비교 (measure: AVG 1인당 / dim: 학교) — 충북, 이번달
--    (사전집계=사용자별 SUM → 재집계=학교별 AVG)
-- =====================================================
SELECT
    sch_nm,
    avg_pay_per_user
FROM (
    SELECT
        pay.sch_nm AS sch_nm,
        AVG(pay.__pre_agg_sum_pay_dlng_amt) AS avg_pay_per_user
    FROM (
        SELECT
            u.SCH_NM AS sch_nm,
            p.USER_ID AS user_id,
            SUM(p.DLNG_AMT) AS __pre_agg_sum_pay_dlng_amt
        FROM TB_COM_PAY_APRV_DEV p
        INNER JOIN TB_COM_USER_DEV u ON u.USER_ID = p.USER_ID
        INNER JOIN TB_COM_EXT_INSTT_DEV i ON i.INSTT_ID = u.SCHOOL_INSTT_ID
        WHERE i.AREA_NM = '충청북도'
          AND LEFT(p.DLNG_DT, 6) = '202606'
        GROUP BY u.SCH_NM, p.USER_ID
    ) AS pay
    GROUP BY pay.sch_nm
) AS agg
ORDER BY
    avg_pay_per_user DESC;

-- =====================================================
-- 4. 조르기(용돈요청) 비교 (measure: COUNT 횟수, SUM 금액 / dim: 학교)
-- =====================================================
SELECT
    sch_nm,
    cnt_jorugi,
    sum_jorugi_amt
FROM (
    SELECT
        log.sch_nm AS sch_nm,
        SUM(log.__pre_agg_cnt_jorugi) AS cnt_jorugi,
        SUM(log.__pre_agg_sum_jorugi_amt) AS sum_jorugi_amt
    FROM (
        SELECT
            u.SCH_NM AS sch_nm,
            COUNT(*) AS __pre_agg_cnt_jorugi,
            SUM(l.AMOUNT) AS __pre_agg_sum_jorugi_amt
        FROM TB_COM_ACCOUNT_LOG_DEV l
        INNER JOIN TB_COM_USER_DEV u ON u.USER_ID = l.USER_ID
        WHERE l.TYPE_CD = 'P'
        GROUP BY u.SCH_NM
    ) AS log
    GROUP BY log.sch_nm
) AS agg
ORDER BY
    sum_jorugi_amt DESC;

-- =====================================================
-- 5. 근처 사용 가능 가맹점 (거리순) — 비집계 목록형, 현위치 리터럴
-- =====================================================
SELECT
    merchant_nm,
    addr,
    distance_m
FROM (
    SELECT
        v.MERCHANT_NM AS merchant_nm,
        v.ADDR AS addr,
        ROUND(6371000 * ACOS(
            COS(RADIANS(36.6424)) * COS(RADIANS(v.LATITUDE)) *
            COS(RADIANS(v.LONGITUDE) - RADIANS(127.4890)) +
            SIN(RADIANS(36.6424)) * SIN(RADIANS(v.LATITUDE))
        )) AS distance_m
    FROM TB_COM_VOUCHER_DEV v
    WHERE v.USE_YN = 'Y'
      AND v.VOUCHER_STTS_NM = '정상'
      AND v.LATITUDE IS NOT NULL
) AS agg
ORDER BY
    distance_m ASC
LIMIT 20;

-- =====================================================
-- 6. 현재 사용 가능 금액 - 지원금 잔액 (measure: SUM 지원금 - 지원금사용)
--    총지원금(ACCOUNT_LOG TYPE_CD='S') - 지원금사용(PAY_MEAN_CD='VOUCHER')
-- =====================================================
SELECT
    user_id,
    sum_support_granted,
    sum_support_used,
    sum_support_granted - sum_support_used AS support_balance
FROM (
    SELECT
        'USR131' AS user_id,
        (SELECT SUM(__pre_agg_granted) FROM (
            SELECT SUM(AMOUNT) AS __pre_agg_granted
            FROM TB_COM_ACCOUNT_LOG_DEV
            WHERE USER_ID = 'USR131' AND TYPE_CD = 'S'
            GROUP BY USER_ID
        ) AS g) AS sum_support_granted,
        (SELECT SUM(__pre_agg_used) FROM (
            SELECT SUM(DLNG_AMT) AS __pre_agg_used
            FROM TB_COM_PAY_APRV_DEV
            WHERE USER_ID = 'USR131' AND PAY_MEAN_CD = 'VOUCHER'
            GROUP BY USER_ID
        ) AS u) AS sum_support_used
) AS agg
ORDER BY
    user_id ASC;

-- =====================================================
-- 7. 온라인/오프라인 결제 (measure: SUM 금액, COUNT 건수 / dim: 채널)
-- =====================================================
SELECT
    channel_cd,
    cnt_pay,
    sum_pay_dlng_amt
FROM (
    SELECT
        pay.channel_cd AS channel_cd,
        SUM(pay.__pre_agg_cnt_pay) AS cnt_pay,
        SUM(pay.__pre_agg_sum_pay_dlng_amt) AS sum_pay_dlng_amt
    FROM (
        SELECT
            CHANNEL_CD AS channel_cd,
            COUNT(*) AS __pre_agg_cnt_pay,
            SUM(DLNG_AMT) AS __pre_agg_sum_pay_dlng_amt
        FROM TB_COM_PAY_APRV_DEV
        WHERE USER_ID = 'USR131'
          AND LEFT(DLNG_DT, 6) = '202606'
        GROUP BY CHANNEL_CD
    ) AS pay
    GROUP BY pay.channel_cd
) AS agg
ORDER BY
    sum_pay_dlng_amt DESC;

-- =====================================================
-- 8. 어디에 주로 쓰는지 (measure: SUM 금액 / dim: 업종 카테고리)
-- =====================================================
SELECT
    category_cd,
    sum_pay_dlng_amt
FROM (
    SELECT
        pay.category_cd AS category_cd,
        SUM(pay.__pre_agg_sum_pay_dlng_amt) AS sum_pay_dlng_amt
    FROM (
        SELECT
            v.CATEGORY_CD AS category_cd,
            SUM(p.DLNG_AMT) AS __pre_agg_sum_pay_dlng_amt
        FROM TB_COM_PAY_APRV_DEV p
        INNER JOIN TB_COM_VOUCHER_DEV v ON v.MERCHANT_NO = p.FRCS_NO
        WHERE p.USER_ID = 'USR131'
        GROUP BY v.CATEGORY_CD
    ) AS pay
    GROUP BY pay.category_cd
) AS agg
ORDER BY
    sum_pay_dlng_amt DESC;

-- =====================================================
-- 9. 부모 카드 사용 내역 (비집계 목록형 / filter: 결제수단=부모카드)
-- =====================================================
SELECT
    gds_nm,
    dlng_dt,
    dlng_amt
FROM (
    SELECT
        GDS_NM AS gds_nm,
        DLNG_DT AS dlng_dt,
        DLNG_AMT AS dlng_amt
    FROM TB_COM_PAY_APRV_DEV
    WHERE USER_ID = 'USR131'
      AND PAY_MEAN_CD = 'PARENT_CARD'
) AS agg
ORDER BY
    dlng_dt DESC;

-- =====================================================
-- 10. 학교별 사용 비교 (measure: SUM 금액 / dim: 학교) — 충북 중학교 TOP5
-- =====================================================
SELECT
    sch_nm,
    sum_pay_dlng_amt
FROM (
    SELECT
        pay.sch_nm AS sch_nm,
        SUM(pay.__pre_agg_sum_pay_dlng_amt) AS sum_pay_dlng_amt
    FROM (
        SELECT
            u.SCH_NM AS sch_nm,
            SUM(p.DLNG_AMT) AS __pre_agg_sum_pay_dlng_amt
        FROM TB_COM_PAY_APRV_DEV p
        INNER JOIN TB_COM_USER_DEV u ON u.USER_ID = p.USER_ID
        INNER JOIN TB_COM_EXT_INSTT_DEV i ON i.INSTT_ID = u.SCHOOL_INSTT_ID
        WHERE i.AREA_NM = '충청북도'
          AND i.INSTT_TY = '중학교'
          AND LEFT(p.DLNG_DT, 6) = '202606'
        GROUP BY u.SCH_NM
    ) AS pay
    GROUP BY pay.sch_nm
) AS agg
ORDER BY
    sum_pay_dlng_amt DESC
LIMIT 5;
