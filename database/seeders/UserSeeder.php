<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create multiple users
        User::insert([
            [
                'id' => 2,
                'name' => 'Gregg Fuentes',
                'email' => 'gregg@gregg.com',
                'email_verified_at' => null,
                'password' => '$2y$12$5j2/3wqZiTJYww6.1Jsf3u2qWJbzdvNbQk3HlDo3sOLy..Vm5O5Fa',
                'store_name' => 'MYEUREKA PH OPC',
                'session_token' => 'MyM470fRg6ticAdXaWBoLBpImPDCpJilAJlnerRlypNfBTqlWwW3VsAtUrus',
                'last_activity' => '2025-10-17 16:32:07',
                'remember_token' => null,
                'created_at' => '2025-07-29 23:38:22',
                'updated_at' => '2025-07-29 23:38:22',
            ],
            [
                'id' => 11,
                'name' => 'Jon Villanueva ',
                'email' => 'jon@jon.com',
                'email_verified_at' => null,
                'password' => '$2y$12$5j2/3wqZiTJYww6.1Jsf3u2qWJbzdvNbQk3HlDo3sOLy..Vm5O5Fa',
                'store_name' => 'MYEUREKA PH OPC',
                'session_token' => 'pto2IITGOePzcF9X1XWSbTLLOPSoxeprHt4cYNargPy7jtrVM9eWX0bN7xrb',
                'last_activity' => '2025-10-17 09:30:28',
                'remember_token' => null,
                'created_at' => '2025-07-29 23:38:22',
                'updated_at' => '2025-07-29 23:38:22',
            ],
         
        ]);
    }
}
