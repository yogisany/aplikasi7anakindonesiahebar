
import React from 'react';
import Button from './Button';
import LogoutIcon from './icons/LogoutIcon';
import { User } from '../types';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  title: string;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, title }) => {
  return (
    <header className="bg-white shadow-md p-4 sticky top-0 z-10">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary-800">{title}</h1>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-semibold text-gray-700">{user.name}</p>
            <p className="text-sm text-gray-500 capitalize">{user.role}</p>
          </div>
          <Button onClick={onLogout} variant="danger" aria-label="Logout">
            <LogoutIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
