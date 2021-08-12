import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import { UserEvent, UserEventTypeEnum } from './user.event';

@Injectable()
export class UsersService {
  constructor(
    private eventEmiter: EventEmitter2,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  /**
   * Create user
   */
  async createUser(user: User) {
    await this.users.insert(user);

    const event = new UserEvent();
    event.type = UserEventTypeEnum.UserCreated;
    event.user = user;

    return this.eventEmiter.emitAsync(UserEvent.name, event);
  }

  /**
   * Delete user
   */
  async deleteUser(user: User) {
    await this.users.delete(user);

    const event = new UserEvent();
    event.type = UserEventTypeEnum.UserDeleted;
    event.user = user;

    return this.eventEmiter.emitAsync(UserEvent.name, event);
  }

  async findById(id: string) {
    return await this.users.findOne(id);
  }

  async findByIdOrFail(id: string) {
    return await this.users.findOneOrFail(id);
  }

  async findByUsername(username: string) {
    return await this.users.findOne({ username });
  }

  async findByUsernameOrFail(username: string) {
    return await this.users.findOneOrFail({ username });
  }
}
