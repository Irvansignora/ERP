import { Test, TestingModule } from '@nestjs/testing';
import { TaxValidatorService } from '../../src/infrastructure/validators/tax-validator.service';
import { Partner, PartnerType, TaxStatus } from '../../src/domain/entities/partner.entity';

describe('TaxValidatorService', () => {
  let service: TaxValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaxValidatorService],
    }).compile();

    service = module.get<TaxValidatorService>(TaxValidatorService);
  });

  describe('validateNpwp16', () => {
    it('should validate correct NPWP 16', () => {
      const result = service.validateNpwp16('0202338927031000');
      expect(result.valid).toBe(true);
    });

    it('should reject NPWP with less than 16 digits', () => {
      const result = service.validateNpwp16('020233892703100');
      expect(result.valid).toBe(false);
    });

    it('should reject NPWP with non-numeric characters', () => {
      const result = service.validateNpwp16('020233892703100A');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateNik', () => {
    it('should validate correct NIK', () => {
      const result = service.validateNik('3175012345678901');
      expect(result.valid).toBe(true);
    });

    it('should reject NIK with less than 16 digits', () => {
      const result = service.validateNik('317501234567890');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateNitku', () => {
    it('should validate correct NITKU', () => {
      const result = service.validateNitku('0202338927031000000000');
      expect(result.valid).toBe(true);
    });

    it('should reject NITKU with less than 22 digits', () => {
      const result = service.validateNitku('020233892703100000000');
      expect(result.valid).toBe(false);
    });
  });
});
