load(
  '//lib/builders.star',
  'builder',
  'defaults',
  'dimensions',
  'config_section',
  'builder_descriptor',
  'generate_ci_configs',
)

generate_ci_configs(
    configurations = [
      config_section(
        name="ci",
        branch='refs/heads/master',
        view='Main',
        name_suffix = ''
      ),
      config_section(
        name="beta",
        branch='refs/heads/chromium/3987',
        view='Beta',
        name_suffix = ' beta'
      ),
    ],
    builders = [
      builder_descriptor(
        name='DevTools Linux',
        recipe_name='chromium_integration',
        is_master_only=True
      ),
      builder_descriptor(
        name="Stand-alone Linux",
        recipe_name="devtools/devtools-frontend",
      ),
    ]
)

builder(
    name="Auto-roll - devtools deps",
    bucket="ci",
    mastername="client.devtools-frontend.integration",
    service_account='devtools-ci-autoroll-builder@chops-service-accounts.iam.gserviceaccount.com',
    schedule="0 3,12 * * *",
    recipe_name="v8/auto_roll_v8_deps",
    dimensions=dimensions.default_ubuntu,
    execution_timeout=2 * time.hour
)

luci.list_view(
    name="infra",
    title="Infra",
    favicon=defaults.favicon,
    entries =[luci.list_view_entry(builder="Auto-roll - devtools deps")],
)
