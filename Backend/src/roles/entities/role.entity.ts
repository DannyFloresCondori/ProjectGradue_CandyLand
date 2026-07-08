import { User } from "src/users/entities/user.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('roles')
export class Role {

    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 20, unique: true })
    name!: string;

    @Column({ type: 'varchar', length: 150, nullable: true })
    description?: string;

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;

    @OneToMany(() => User, (user) => user.role )
    users!:User[];

}
