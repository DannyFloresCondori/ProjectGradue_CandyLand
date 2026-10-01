import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './auth.decorators';
import { LoginUserDto } from './dto/login-dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post('login')
  login(@Body() LoginDto: LoginUserDto) {
    return this.authService.login(LoginDto);
  }
}