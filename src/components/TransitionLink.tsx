import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTransitionNavigate } from '../hooks/useTransitionNavigate';
import { cn } from '../lib/utils';

interface TransitionLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    to: string;
    className?: string;
    activeClassName?: string;
    children: React.ReactNode;
}

export function TransitionLink({
    to,
    className,
    activeClassName,
    children,
    onClick,
    ...props
}: TransitionLinkProps) {
    const navigate = useTransitionNavigate();
    const location = useLocation();
    const isActive = location.pathname === to;

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        if (onClick) onClick(e);

        if (location.pathname === to) return; // No navegar si ya estamos ahí

        navigate(to);
    };

    return (
        <a
            href={to}
            onClick={handleClick}
            className={cn(className, isActive && activeClassName)}
            {...props}
        >
            {children}
        </a>
    );
}
