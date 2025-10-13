import React from 'react';

const Badge = ({
	children,
	variant = 'default',
	size = 'sm',
	className = ''
}) => {
	const variants = {
		default: 'bg-slate-100 text-slate-700',
		primary: 'bg-amber-100 text-amber-700',
		success: 'bg-green-100 text-green-700',
		danger: 'bg-red-100 text-red-700',
		warning: 'bg-orange-100 text-orange-700',
		info: 'bg-blue-100 text-blue-700',
		purple: 'bg-purple-100 text-purple-700'
	};

	const sizes = {
		xs: 'px-2 py-1 text-xs',
		sm: 'px-2.5 py-1 text-xs',
		md: 'px-3 py-1.5 text-sm'
	};

	return (
		<span className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]} ${className}`}>
			{children}
		</span>
	);
};

export default Badge;
