import { ConfigService } from "@nestjs/config";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { join } from "path";

export const TypeOrmConfig = (
    configService: ConfigService,
): TypeOrmModuleOptions => ({
    type: 'postgres',

    host: configService.get<string>('DB_HOST'),
    port: +configService.get<string>('DB_PORT','5432'),
    username: configService.get<string>('DB_USER'),
    password: configService.get<string>('DB_PASS'),
    database: configService.get<string>('DB_NAME'),
    entities: [join(__dirname, '../**/*.entity.{ts,js}')],
    migrations: [join(__dirname, '../migrations/*.{ts,js}')],
    migrationsRun: configService.get<string>('DB_MIGRATIONS_RUN', 'true') === 'true',
    synchronize: false,

})