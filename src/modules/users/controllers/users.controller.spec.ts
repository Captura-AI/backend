// Entities
import { UsersEntity } from '../entities/users.entity';

// Enums
import { UserRoleEnum } from '../enums/user-role.enum';

// NestJS Libraries
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Controllers
import { UsersController } from './users.controller';

// Services
import { UsersService } from '../services/users.service';

const mockUser = (): UsersEntity & { photographerProfile: null } => {
  const user = new UsersEntity();
  user.id = 'user-uuid-1';
  user.email = 'test@test.com';
  user.username = 'testuser';
  user.role = UserRoleEnum.USER;
  return Object.assign(user, { photographerProfile: null });
};

const mockRequestUser = (): IRequestUser => ({
  email: 'test@test.com',
  id: 'user-uuid-1',
  role: UserRoleEnum.USER as TUserRole,
  username: 'testuser',
});

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: {
    getMe: jest.Mock;
  };

  beforeEach(async () => {
    mockUsersService = {
      getMe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMe()', () => {
    it('calls service.getMe with user id and returns result', async () => {
      const user = mockUser();
      const requestUser = mockRequestUser();

      mockUsersService.getMe.mockResolvedValue(user);

      const response = await controller.getMe(requestUser);

      expect(mockUsersService.getMe).toHaveBeenCalledWith('user-uuid-1');
      expect(response).toEqual({
        message: 'Profile retrieved successfully',
        result: user,
      });
    });
  });
});
