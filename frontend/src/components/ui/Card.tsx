import type { HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLElement>;
type CardContentProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = '', ...props }: CardProps) {
  return <section className={`ui-card ${className}`.trim()} {...props} />;
}

export function CardHeader({ className = '', ...props }: CardContentProps) {
  return <div className={`ui-card-header ${className}`.trim()} {...props} />;
}

export function CardTitle({ className = '', ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`ui-card-title ${className}`.trim()} {...props} />;
}

export function CardDescription({ className = '', ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`ui-card-description ${className}`.trim()} {...props} />;
}

export function CardContent({ className = '', ...props }: CardContentProps) {
  return <div className={`ui-card-content ${className}`.trim()} {...props} />;
}
