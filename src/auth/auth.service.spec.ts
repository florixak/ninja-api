import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { DATABASE_CONNECTION } from '../database/database.module';
import { Role } from './enums/role.enum';

jest.mock('argon2');

type MockDb = {
  select: jest.Mock;
  from: jest.Mock;
  where: jest.Mock;
  limit: jest.Mock;
};

describe('AuthService', () => {
  let authService: AuthService;
  let mockDb: MockDb;
  let mockJwtService: { signAsync: jest.Mock };

  const mockUser = {
    id: 1,
    email: 'admin@example.com',
    passwordHash: 'hashed-password',
    role: Role.ADMIN,
  };

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn(),
    };

    mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DATABASE_CONNECTION, useValue: mockDb },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('login', () => {
    it('returns an access token for valid credentials', async () => {
      mockDb.limit.mockResolvedValue([mockUser]);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await authService.login({
        email: 'admin@example.com',
        password: 'correct-password',
      });

      expect(result).toEqual({ accessToken: 'mock-jwt-token' });
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(1);
      expect(argon2.verify).toHaveBeenCalledWith(
        mockUser.passwordHash,
        'correct-password',
      );
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('throws UnauthorizedException when the user does not exist', async () => {
      mockDb.limit.mockResolvedValue([]);

      await expect(
        authService.login({ email: 'nobody@example.com', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(argon2.verify).not.toHaveBeenCalled();
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the password is wrong', async () => {
      mockDb.limit.mockResolvedValue([mockUser]);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({ email: mockUser.email, password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the user has an invalid role', async () => {
      mockDb.limit.mockResolvedValue([{ ...mockUser, role: 'superadmin' }]);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      await expect(
        authService.login({
          email: mockUser.email,
          password: 'correct-password',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('uses a generic error message to avoid leaking account details', async () => {
      mockDb.limit.mockResolvedValue([]);

      await expect(
        authService.login({ email: 'nobody@example.com', password: 'x' }),
      ).rejects.toThrow('Invalid email or password');
    });
  });
});
