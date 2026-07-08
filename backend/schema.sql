CREATE DATABASE IF NOT EXISTS stock_data_warehouse;

USE stock_data_warehouse;

-- Drop existing tables to avoid conflicts
DROP TABLE IF EXISTS trade_data;
DROP TABLE IF EXISTS indicators;
DROP TABLE IF EXISTS stock_prices;
DROP TABLE IF EXISTS companies;

DROP TABLE IF EXISTS trades;
DROP TABLE IF EXISTS market_news;
DROP TABLE IF EXISTS corporate_actions;
DROP TABLE IF EXISTS technical_indicators;
DROP TABLE IF EXISTS exchanges;

CREATE TABLE exchanges (
    exchange_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(50),
    timezone VARCHAR(50)
) ENGINE=InnoDB;

CREATE TABLE companies (
    company_id INT AUTO_INCREMENT PRIMARY KEY,
    ticker VARCHAR(10) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    sector VARCHAR(100),
    industry VARCHAR(100),
    country VARCHAR(50),
    exchange_id INT,
    ipo_date DATE,
    market_cap BIGINT,
    profile_data JSON,
    FOREIGN KEY (exchange_id) REFERENCES exchanges(exchange_id)
) ENGINE=InnoDB;

CREATE TABLE stock_prices (
    price_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    timestamp DATETIME NOT NULL,
    span ENUM('1min','5min','15min','1hour','1day') NOT NULL,
    open_price DECIMAL(10,2),
    high_price DECIMAL(10,2),
    low_price DECIMAL(10,2),
    close_price DECIMAL(10,2),
    volume BIGINT,
    vwap DECIMAL(10,2),
    UNIQUE KEY unique_price (company_id, timestamp, span),
    FOREIGN KEY (company_id) REFERENCES companies(company_id)
) ENGINE=InnoDB;

CREATE TABLE technical_indicators (
    indicator_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    timestamp DATETIME NOT NULL,
    span ENUM('1min','5min','1day') NOT NULL,
    rsi DECIMAL(5,2),
    macd DECIMAL(10,4),
    ma_50 DECIMAL(10,2),
    ma_200 DECIMAL(10,2),
    bollinger_upper DECIMAL(10,2),
    bollinger_lower DECIMAL(10,2),
    UNIQUE KEY unique_indicator (company_id, timestamp, span),
    FOREIGN KEY (company_id) REFERENCES companies(company_id)
) ENGINE=InnoDB;

CREATE TABLE corporate_actions (
    action_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    action_type ENUM('DIVIDEND','SPLIT','BONUS') NOT NULL,
    action_date DATE NOT NULL,
    value DECIMAL(10,2),
    ratio VARCHAR(20),
    FOREIGN KEY (company_id) REFERENCES companies(company_id)
) ENGINE=InnoDB;

CREATE TABLE market_news (
    news_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    headline VARCHAR(500),
    source VARCHAR(100),
    published_at DATETIME,
    sentiment_score DECIMAL(3,2),
    FOREIGN KEY (company_id) REFERENCES companies(company_id)
) ENGINE=InnoDB;

CREATE TABLE trades (
    trade_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    timestamp DATETIME NOT NULL,
    price DECIMAL(10,2),
    quantity INT,
    FOREIGN KEY (company_id) REFERENCES companies(company_id)
) ENGINE=InnoDB;

CREATE INDEX idx_stock_time ON stock_prices(company_id, timestamp);
CREATE INDEX idx_indicator_time ON technical_indicators(company_id, timestamp);
CREATE INDEX idx_trade_time ON trades(company_id, timestamp);
