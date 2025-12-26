const WalletManager = require('../WalletManager');
const axios = require('axios');

jest.mock('axios');

describe('WalletManager', () => {
  let walletManager;

  beforeEach(() => {
    walletManager = new WalletManager('http://test-node:16111');
    jest.clearAllMocks();
  });

  describe('validateKaspaAddress', () => {
    it('should validate correct Kaspa address', () => {
      const validAddress = 'kaspa:qz4wqhgqrqx2qfqaktchfprgdqx2qfqaktchfprgdqx2qfqaktchfprgdqx2qfqaktchfprg';
      expect(() => walletManager.validateKaspaAddress(validAddress)).not.toThrow();
    });

    it('should reject empty address', () => {
      expect(() => walletManager.validateKaspaAddress('')).toThrow('Address is required');
    });

    it('should reject null address', () => {
      expect(() => walletManager.validateKaspaAddress(null)).toThrow('Address is required');
    });

    it('should reject address with invalid length', () => {
      expect(() => walletManager.validateKaspaAddress('kaspa:short')).toThrow('Invalid address length');
    });

    it('should reject address with invalid characters', () => {
      const invalidAddress = 'kaspa:qz4wqhgqrqx2qfqaktchfprgdqx2qfqaktchfprgdqx2qfqaktchfprgdqx2qfqaktchfprg@#$';
      expect(() => walletManager.validateKaspaAddress(invalidAddress)).toThrow('Invalid address format');
    });
  });

  describe('validateAmount', () => {
    it('should validate positive amount', () => {
      expect(() => walletManager.validateAmount(10.5)).not.toThrow();
    });

    it('should reject zero amount', () => {
      expect(() => walletManager.validateAmount(0)).toThrow('Amount must be a positive number');
    });

    it('should reject negative amount', () => {
      expect(() => walletManager.validateAmount(-5)).toThrow('Amount must be a positive number');
    });

    it('should reject non-numeric amount', () => {
      expect(() => walletManager.validateAmount('invalid')).toThrow('Amount must be a positive number');
    });

    it('should reject amount exceeding max supply', () => {
      expect(() => walletManager.validateAmount(30000000000)).toThrow('Amount exceeds maximum possible value');
    });

    it('should reject amount with too many decimal places', () => {
      expect(() => walletManager.validateAmount(1.123456789)).toThrow('Amount has too many decimal places');
    });
  });

  describe('validatePassword', () => {
    it('should validate strong password', () => {
      expect(() => walletManager.validatePassword('StrongPass123!')).not.toThrow();
    });

    it('should reject empty password', () => {
      expect(() => walletManager.validatePassword('')).toThrow('Password is required');
    });

    it('should reject short password', () => {
      expect(() => walletManager.validatePassword('short')).toThrow('Password must be at least 8 characters');
    });

    it('should reject weak password', () => {
      expect(() => walletManager.validatePassword('password')).toThrow('Password must contain at least 3 of');
    });
  });
});