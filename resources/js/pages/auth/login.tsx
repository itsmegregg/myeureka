import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, AlertCircle } from 'lucide-react';
import { FormEventHandler, useEffect } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import AppLogo from '@/components/app-logo';
import { BackgroundPaths } from '@/components/ui/background-paths';
import AppLogoIcon from '@/components/app-logo-icon';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';


type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
};

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm<Required<LoginForm>>({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    // No toast notification - errors will be displayed inline

    return (
        <div className='flex h-screen w-full bg-background'>
            <Head title="Login" />
            <div className='flex flex-col md:flex-row w-full h-full shadow-lg overflow-hidden'>
                <div className='relative w-full md:w-1/2 h-full bg-primary/10 overflow-hidden hidden md:block'>
                    <BackgroundPaths/>
                    
                </div>
                <div className='w-full md:w-1/2 flex items-center justify-center h-full bg-background'>
                    <div className="w-full max-w-md px-8 py-12">
                        <div className="flex items-center justify-center mb-8 flex-col gap-3">
                            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-md">
                                <AppLogoIcon className="size-8  fill-current text-white dark:text-black" />
                               
                            </div>
                            <h1 className='text-2xl font-semibold md:hidden lg:hidden'>Report Management System</h1>
                        </div>
                     
                       <form onSubmit={submit} className='space-y-6'>
                            <div className='space-y-4'>
                                <div>
                                <Label htmlFor="email">Email</Label>
                                <Input 
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className={cn(
                                      "mt-1 block w-full",
                                      errors.email?.includes("already logged in") && "border-destructive focus-visible:ring-destructive"
                                    )}
                                    placeholder="name@example.com"
                                    autoComplete="username"
                                    required
                                />
                                <InputError message={errors.email} />
                                </div>
                            
                                <div>
                                <Label htmlFor="password">Password</Label>
                                <Input 
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    required
                                />
                                <InputError message={errors.password} />
                                </div>
                            
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="remember"
                                            checked={data.remember}
                                            onCheckedChange={(checked) => 
                                                setData('remember', checked === true)}
                                        />
                                        <Label htmlFor="remember" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Remember me</Label>
                                    </div>
                                </div>
                        </div>
                        
                            <Button type="submit" className="w-full" disabled={processing}>
                                {processing ? (
                                    <>
                                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                        Logging in...
                                    </>
                                ) : (
                                    'Log in'
                                )}
                            </Button>
                        
                            {status && <p className="mt-4 text-sm text-center text-green-500">{status}</p>}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
