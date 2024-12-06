import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Disclosure } from '@headlessui/react';
import { HomeIcon, CpuChipIcon, Cog6ToothIcon, BuildingLibraryIcon } from '@heroicons/react/24/outline';
import { ChevronRightIcon } from '@heroicons/react/20/solid';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
  },
  {
    name: 'Trading Bots',
    icon: CpuChipIcon,
    children: [
      { name: 'My Bots', href: '/dashboard/bots' },
      { name: 'My Deals', href: '/dashboard/deals' },
    ]
  },
  {
    name: 'Exchanges',
    href: '/dashboard/exchanges',
    icon: BuildingLibraryIcon,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Cog6ToothIcon,
  },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#0B1120] text-white">
      <div className="flex flex-1 flex-col overflow-y-auto">
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => (
            <Fragment key={item.name}>
              {!item.children ? (
                <Link
                  href={item.href}
                  className={classNames(
                    pathname === item.href
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-md'
                  )}
                >
                  <item.icon
                    className={classNames(
                      'mr-3 flex-shrink-0 h-6 w-6',
                      pathname === item.href ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ) : (
                <Disclosure as="div" defaultOpen={pathname.includes('/dashboard/bots') || pathname.includes('/dashboard/deals')}>
                  {({ open }) => (
                    <>
                      <Disclosure.Button
                        className={classNames(
                          pathname.includes('/dashboard/bots') || pathname.includes('/dashboard/deals')
                            ? 'bg-gray-800 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                          'group flex w-full items-center px-3 py-2 text-sm font-medium rounded-md'
                        )}
                      >
                        <item.icon
                          className={classNames(
                            'mr-3 flex-shrink-0 h-6 w-6',
                            pathname.includes('/dashboard/bots') || pathname.includes('/dashboard/deals')
                              ? 'text-white'
                              : 'text-gray-400 group-hover:text-gray-300'
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                        <ChevronRightIcon
                          className={classNames(
                            open ? 'rotate-90 text-gray-400' : 'text-gray-300',
                            'ml-auto h-5 w-5 transform transition-colors duration-150 ease-in-out group-hover:text-gray-300'
                          )}
                        />
                      </Disclosure.Button>
                      <Disclosure.Panel className="space-y-1">
                        {item.children.map((subItem) => (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            className={classNames(
                              pathname === subItem.href
                                ? 'bg-gray-800 text-white'
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                              'group flex items-center pl-11 pr-3 py-2 text-sm font-medium rounded-md'
                            )}
                          >
                            {subItem.name}
                          </Link>
                        ))}
                      </Disclosure.Panel>
                    </>
                  )}
                </Disclosure>
              )}
            </Fragment>
          ))}
        </nav>
      </div>
    </div>
  );
} 